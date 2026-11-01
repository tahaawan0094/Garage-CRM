; ==============================================================================
; GARAGE CRM SUITE - INNO SETUP SCRIPT
; ==============================================================================
; Purpose: Windows Desktop Installer Builder (.exe)
; Product: Garage CRM Suite (Auto Care & Workshop Operations System)
; Author:  Vertexia Tech Solutions
; ==============================================================================

#define MyAppName "Garage CRM Suite"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Vertexia Tech Solutions"
#define MyAppURL "https://vertexia.tech"
#define MyAppExeName "Garage CRM Suite.exe"
#define MyAppIcon "installer\app.ico"
#define MyAppLicense "installer\LICENSE.txt"

[Setup]
; Unique Application ID (GUID) for registry identification
AppId={{8B6E324A-95FC-4D63-B884-2195E05CE33B}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} v{#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}

; Default installation directory in Program Files (or AppData if non-admin)
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes

; EULA / License Agreement (Shown during installer wizard)
LicenseFile={#MyAppLicense}

; Installer Output Configuration
OutputDir=dist-installer
OutputBaseFilename=Garage-CRM-Suite-Setup-v{#MyAppVersion}
SetupIconFile={#MyAppIcon}
UninstallDisplayIcon={app}\app.ico

; Ultra compression for compact, fast setup .exe
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
WizardResizable=no
DisableProgramGroupPage=auto

; 64-bit Architecture
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=auto
PrivilegesRequiredOverridesAllowed=dialog

; Visual Branding
WizardSmallImageFile=installer\app.ico

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked; OnlyBelowVersion: 6.1; Check: not IsAdminInstallMode

[Files]
; ------------------------------------------------------------------------------
; 1. Embedded Desktop Icon & EULA License
; ------------------------------------------------------------------------------
Source: "installer\app.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "installer\LICENSE.txt"; DestDir: "{app}"; Flags: ignoreversion

; ------------------------------------------------------------------------------
; 2. Standalone Compiled Application / Electron / Web Binary
;    If you build with Electron/Neutralino/Nativefier/Tauri into "release-build" or "dist-app",
;    Inno Setup will automatically package all files from that folder.
; ------------------------------------------------------------------------------
; Case A: If an .exe exists in build directory
Source: "release-build\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Check: DirExists(ExpandConstant('{src}\release-build'))
Source: "dist-app\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Check: DirExists(ExpandConstant('{src}\dist-app'))

; Case B: Frontend Distribution files (Vite output: dist folder)
Source: "dist\*"; DestDir: "{app}\dist"; Flags: ignoreversion recursesubdirs createallsubdirs; Check: DirExists(ExpandConstant('{src}\dist'))

; Case C: Backend files (if bundling node server with portable node)
Source: "backend\*"; DestDir: "{app}\backend"; Flags: ignoreversion recursesubdirs createallsubdirs; Check: DirExists(ExpandConstant('{src}\backend'))

; Case D: Public Assets & Logos
Source: "public\*"; DestDir: "{app}\public"; Flags: ignoreversion recursesubdirs createallsubdirs; Check: DirExists(ExpandConstant('{src}\public'))

[Icons]
; Start Menu Shortcut
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app.ico"; WorkingDir: "{app}"
Name: "{group}\Workshop License Terms"; Filename: "{app}\LICENSE.txt"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"

; Desktop Shortcut
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app.ico"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
; Option to launch application immediately after installation completes
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent; Check: FileExists(ExpandConstant('{app}\{#MyAppExeName}'))

[UninstallDelete]
Type: filesandordirs; Name: "{app}\temp"
Type: files; Name: "{app}\*.log"

[Code]
// Helper function to verify dependencies or custom actions if needed
function InitializeSetup(): Boolean;
begin
  Result := True;
end;

