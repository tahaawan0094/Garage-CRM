const crypto = require('crypto');

const DAY = 86400000;
const hash = (value) => crypto.createHash('sha256').update(String(value || '')).digest('hex');
const validId = (value) => typeof value === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(value);
const deviceIdFor = (publicKey, machineId) => hash(`${publicKey}\n${machineId}`);

const encodeSigned = (payload, privateKey) => {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${crypto.sign(null, Buffer.from(body), privateKey).toString('base64url')}`;
};

const decodeSigned = (token, publicKey) => {
  const parts = String(token || '').split('.');
  if (parts.length !== 2 || parts[0].length > 20000) {
    throw new Error('Invalid license token structure');
  }
  const verified = crypto.verify(null, Buffer.from(parts[0]), publicKey, Buffer.from(parts[1], 'base64url'));
  if (!verified) {
    throw new Error('Invalid license signature');
  }
  const result = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
  return result;
};

const createProof = (action, payload, identity, now = Date.now()) => {
  const body = {
    action,
    payload,
    publicKey: identity.publicKey,
    machineId: identity.machineId,
    timestamp: now,
    nonce: crypto.randomBytes(24).toString('hex'),
  };
  return {
    ...body,
    signature: crypto.sign(null, Buffer.from(JSON.stringify(body)), identity.privateKey).toString('base64url'),
  };
};

const verifyProof = (request, action, now = Date.now()) => {
  const { signature, ...body } = request || {};
  if (body.action !== action || !Number.isFinite(body.timestamp) || Math.abs(now - body.timestamp) > 300000 || !/^[a-f0-9]{48}$/.test(body.nonce || '') || !/^[a-f0-9]{64}$/.test(body.machineId || '')) {
    throw new Error('Invalid device request or computer clock');
  }
  const key = crypto.createPublicKey(body.publicKey);
  if (key.asymmetricKeyType !== 'ed25519' || !crypto.verify(null, Buffer.from(JSON.stringify(body)), key, Buffer.from(signature || '', 'base64url'))) {
    throw new Error('Invalid device proof');
  }
  return { ...body, deviceId: deviceIdFor(body.publicKey, body.machineId) };
};

module.exports = {
  DAY,
  hash,
  validId,
  deviceIdFor,
  encodeSigned,
  decodeSigned,
  createProof,
  verifyProof,
};

