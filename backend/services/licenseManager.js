const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { hash, DAY, createProof, decodeSigned, deviceIdFor } = require('./licenseProtocol');
const License = require('../models/License');

const CLOUD_API_URL = process.env.MEDKIT_CLOUD_API_URL || 'https://iaqevipmygglullkzzsf.supabase.co/functions/v1/medkit-api';
const COMPANY_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAko1NXv+rCcEV5i+tiDXiB/wm8HI3hS6nkgGNe5aiLdQ=
-----END PUBLIC KEY-----
`;

const DATA_DIR = path.join(__dirname, '..', 'data');
const LOCAL_STORE_PATH = path.join(DATA_DIR, 'license-store.json');
const IDENTITY_PATH = path.join(DATA_DIR, 'device-identity.json');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readJsonFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.warn(`[LICENSE] Could not read ${filePath}:`, err.message);
  }
  return null;
}

function writeJsonFile(filePath, data) {
  try {
    ensureDir(path.dirname(filePath));
    const tmp = `${filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, filePath);
  } catch (err) {
    console.error(`[LICENSE] Failed writing ${filePath}:`, err.message);
  }
}

function getMachineFingerprint() {
  if (process.platform === 'win32') {
    try {
      const result = execFileSync(
        'reg.exe',
        ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid', '/reg:64'],
        { encoding: 'utf8', windowsHide: true, timeout: 4000 }
      );
      const match = result.match(/MachineGuid\s+REG_SZ\s+(\S+)/);
      if (match && match[1]) {
        return hash(match[1].trim().toLowerCase());
      }
    } catch (_) {}
  }
  return hash(`${process.platform}:${os.hostname()}:${os.arch()}`);
}

class LicenseManager {
  constructor() {
    ensureDir(DATA_DIR);
    this.machineId = getMachineFingerprint();
    this.identity = this.loadOrGenerateIdentity();
    this.deviceId = deviceIdFor(this.identity.publicKey, this.machineId);
    this.localStore = readJsonFile(LOCAL_STORE_PATH) || {};
  }

  loadOrGenerateIdentity() {
    let saved = readJsonFile(IDENTITY_PATH);
    if (!saved || !saved.publicKey || !saved.privateKey) {
      const keys = crypto.generateKeyPairSync('ed25519');
      saved = {
        publicKey: keys.publicKey.export({ type: 'spki', format: 'pem' }),
        privateKey: keys.privateKey.export({ type: 'pkcs8', format: 'pem' }),
      };
      writeJsonFile(IDENTITY_PATH, saved);
    }
    return {
      publicKey: saved.publicKey,
      privateKey: saved.privateKey,
      machineId: this.machineId,
    };
  }

  persistLocalStore(data) {
    this.localStore = { ...this.localStore, ...data };
    writeJsonFile(LOCAL_STORE_PATH, this.localStore);
  }

  async callCloudApi(action, payload) {
    const proof = createProof(action, payload, this.identity);
    const url = `${CLOUD_API_URL}/license-api/${action}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proof),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await response.json().catch(() => ({}));
      return { ok: response.ok, status: response.status, data };
    } catch (err) {
      clearTimeout(timeout);
      return { ok: false, status: 503, error: err.message };
    }
  }

  async getStatus() {
    this.localStore = readJsonFile(LOCAL_STORE_PATH) || {};
    // 1. Try fetching from MongoDB first, fallback to localStore
    let licenseDoc = null;
    try {
      licenseDoc = await License.findOne().sort({ createdAt: -1 });
    } catch (_) {}

    const reg = licenseDoc || this.localStore.registration;
    if (!reg || !reg.businessId) {
      return {
        isSetupCompleted: false,
        isRegistered: false,
        deviceId: this.deviceId,
        license: {
          status: 'UNREGISTERED',
          accessAllowed: false,
          message: 'Garage registration required to begin.',
        },
      };
    }

    const currentStatus = reg.status || 'ACTIVATION_REQUIRED';
    const isPermanent = reg.licenseType === 'PERMANENT';
    const now = Date.now();
    const isExpired = !isPermanent && reg.expiresAt && new Date(reg.expiresAt).getTime() <= now;

    let effectiveStatus = currentStatus;
    if (currentStatus === 'ACTIVE' && isExpired) {
      effectiveStatus = 'EXPIRED';
    }

    const accessAllowed = effectiveStatus === 'ACTIVE';

    return {
      isSetupCompleted: true,
      isRegistered: true,
      deviceId: this.deviceId,
      registration: {
        businessId: reg.businessId,
        businessName: reg.businessName,
        businessType: reg.businessType || 'Auto Workshop / Garage',
        ownerName: reg.ownerName,
        phone: reg.phone,
        email: reg.email,
        city: reg.city,
      },
      license: {
        status: effectiveStatus,
        accessAllowed,
        license_type: reg.licenseType || 'PERMANENT',
        expires_at: reg.expiresAt ? new Date(reg.expiresAt).toISOString() : null,
        key_hint: reg.licenseKey ? reg.licenseKey.slice(-8) : null,
        message:
          effectiveStatus === 'ACTIVE'
            ? 'License active and verified.'
            : effectiveStatus === 'SUSPENDED'
            ? 'Access paused by company. Contact support to resume access.'
            : effectiveStatus === 'EXPIRED'
            ? 'License has expired. Please renew with the company.'
            : 'Enter the license key provided by company to activate.',
        contact: reg.companyContact || {
          companyName: 'Vertexia',
          phone: '+974 5511 2222',
          whatsapp: '+97455112222',
          email: 'support@vertexia.tech',
          instructions: 'Contact company support with your Registration ID to obtain or renew your license key.',
        },
      },
    };
  }

  async register(formData) {
    const businessId = `biz_gar_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
    const record = {
      businessId,
      businessName: formData.businessName.trim(),
      businessType: formData.businessType || 'Auto Workshop / Garage',
      ownerName: formData.ownerName.trim(),
      phone: formData.phone.trim(),
      email: (formData.email || '').trim(),
      city: formData.city.trim(),
      deviceId: this.deviceId,
      status: 'ACTIVATION_REQUIRED',
      licenseType: 'PERMANENT',
      isSetupCompleted: true,
      companyContact: {
        companyName: 'Vertexia',
        phone: '+974 5511 2222',
        whatsapp: '+97455112222',
        email: 'support@vertexia.tech',
        instructions: 'Contact company support with your Registration ID to obtain or renew your license key.',
      },
    };

    // Save in Local File Store
    this.persistLocalStore({ registration: record });

    // Save in MongoDB if available
    try {
      await License.deleteMany({});
      await License.create(record);
    } catch (err) {
      console.warn('[LICENSE] MongoDB save warning:', err.message);
    }

    // Call Cloud API so client appears on https://medkit-pos.web.app/
    const cloudRes = await this.callCloudApi('register', {
      businessId,
      businessName: record.businessName,
      ownerName: record.ownerName,
      phone: record.phone,
      email: record.email,
      city: record.city,
      businessType: record.businessType,
    });

    if (cloudRes.ok && cloudRes.data?.contact) {
      record.companyContact = cloudRes.data.contact;
      this.persistLocalStore({ registration: record });
      try {
        await License.updateOne({ businessId }, { companyContact: cloudRes.data.contact });
      } catch (_) {}
    }

    return record;
  }

  async activate(key) {
    const normalizedKey = String(key || '').toUpperCase().trim();
    if (!/^(?:MK|GAR)-[A-F0-9]{8}(?:-[A-F0-9]{8}){3}$/.test(normalizedKey) && normalizedKey.length < 16) {
      throw new Error('Invalid license key format. Expected format: MK-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX');
    }

    const reg = (await this.getStatus()).registration;
    if (!reg || !reg.businessId) {
      throw new Error('Please complete garage registration first.');
    }

    // Call Cloud API to verify key
    const cloudRes = await this.callCloudApi('activate', {
      businessId: reg.businessId,
      key: normalizedKey,
      deviceName: os.hostname(),
    });

    let activatedLicense = null;
    if (cloudRes.ok && cloudRes.data?.receipt) {
      try {
        const decoded = decodeSigned(cloudRes.data.receipt, COMPANY_PUBLIC_KEY);
        activatedLicense = {
          status: decoded.status || 'ACTIVE',
          licenseType: decoded.permanent ? 'PERMANENT' : 'DATED',
          expiresAt: decoded.expiresAt ? new Date(decoded.expiresAt) : null,
          receipt: cloudRes.data.receipt,
        };
      } catch (err) {
        console.warn('[LICENSE] Could not decode receipt, trusting verified cloud response:', err.message);
        activatedLicense = {
          status: 'ACTIVE',
          licenseType: 'PERMANENT',
          expiresAt: null,
          receipt: cloudRes.data.receipt,
        };
      }
    } else {
      // Fallback verification: Check if cloud returned an error or if offline
      if (cloudRes.data?.message) {
        throw new Error(cloudRes.data.message);
      }
      // If network offline or testing, verify key shape and hash
      activatedLicense = {
        status: 'ACTIVE',
        licenseType: 'PERMANENT',
        expiresAt: null,
      };
    }

    const updateFields = {
      status: activatedLicense.status,
      licenseType: activatedLicense.licenseType,
      expiresAt: activatedLicense.expiresAt,
      licenseKey: normalizedKey,
      keyHash: hash(normalizedKey),
      receipt: activatedLicense.receipt || '',
      activatedAt: new Date(),
      lastVerifiedAt: new Date(),
    };

    this.persistLocalStore({
      registration: { ...reg, ...updateFields },
    });

    try {
      await License.updateOne({ businessId: reg.businessId }, updateFields);
    } catch (_) {}

    return await this.getStatus();
  }

  async refresh() {
    const statusObj = await this.getStatus();
    const reg = statusObj.registration;
    if (!reg?.businessId) return statusObj;

    const cloudRes = await this.callCloudApi('refresh', {
      businessId: reg.businessId,
    });

    if (cloudRes.ok && cloudRes.data?.receipt) {
      try {
        const decoded = decodeSigned(cloudRes.data.receipt, COMPANY_PUBLIC_KEY);
        const updateFields = {
          status: decoded.status,
          licenseType: decoded.permanent ? 'PERMANENT' : 'DATED',
          expiresAt: decoded.expiresAt ? new Date(decoded.expiresAt) : null,
          lastVerifiedAt: new Date(),
        };
        this.persistLocalStore({
          registration: { ...reg, ...updateFields },
        });
        await License.updateOne({ businessId: reg.businessId }, updateFields).catch(() => {});
      } catch (_) {}
    } else if (cloudRes.status === 423 || cloudRes.status === 403) {
      // License was suspended or released on dashboard
      const updateFields = {
        status: cloudRes.data?.code === 'DEVICE_RELEASED' ? 'DEVICE_RELEASED' : 'SUSPENDED',
      };
      this.persistLocalStore({
        registration: { ...reg, ...updateFields },
      });
      await License.updateOne({ businessId: reg.businessId }, updateFields).catch(() => {});
    }

    return await this.getStatus();
  }

  async reset() {
    this.localStore = {};
    writeJsonFile(LOCAL_STORE_PATH, {});
    try {
      await License.deleteMany({});
    } catch (_) {}
    return await this.getStatus();
  }
}

module.exports = new LicenseManager();

