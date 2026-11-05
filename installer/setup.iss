; ==============================================================================
; GARAGE CRM SUITE - INNO SETUP INSTALLER SCRIPT
; ==============================================================================
; Built with the exact architecture of MedKit POS (Vertexia Desktop Suite)
; Product:   Garage CRM Suite (Auto Care & Workshop Operations System)
; Company:   Vertexia
; Website:   https://www.vertexiaagency.com
; Email:     support@vertexiaagency.com
; Phone:     +92 317 2981931
; ==============================================================================

#define MyAppName "Garage CRM Suite"
#define MyAppPublisher "Vertexia"
#define MyAppVersion "1.0.0"
#define MyAppExeName "Garage CRM Suite.exe"
#define MyAppURL "https://www.vertexiaagency.com"
#define MyPackageDir "..\desktop-release\win-unpacked"

[Setup]
AppId={{8B6E324A-95FC-4D63-B884-2195E05CE33B}}
AppName={#MyAppName}
LicenseFile=LICENSE.txt
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}

VersionInfoVersion=1.0.0.0
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription={#MyAppName} Installer
VersionInfoProductName={#MyAppName}
VersionInfoCopyright=Copyright (C) 2026 Vertexia

DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
DisableProgramGroupPage=yes

OutputDir=..\dist-installer
OutputBaseFilename=Garage-CRM-Setup
Compression=lzma
SolidCompression=yes
WizardStyle=modern
SetupIconFile=app.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppName}

CloseApplications=yes
CloseApplicationsFilter=*.exe,*.dll,*.node
RestartApplications=no
SetupLogging=yes

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce

[Files]
Source: "{#MyPackageDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "LICENSE.txt"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch {#MyAppName}"; WorkingDir: "{app}"; Flags: nowait postinstall skipifsilent runasoriginaluser

[Code]
var
  PublisherLabel: TNewStaticText;

procedure InitializeWizard;
begin
  PublisherLabel := TNewStaticText.Create(WizardForm);
  PublisherLabel.Parent := WizardForm;
  PublisherLabel.Caption := 'Powered by {#MyAppPublisher} - www.vertexiaagency.com';
  PublisherLabel.Left := ScaleX(8);
  PublisherLabel.Top := WizardForm.ClientHeight - ScaleY(20);
  PublisherLabel.Font.Color := clGray;
  PublisherLabel.Font.Size := 8;
end;
