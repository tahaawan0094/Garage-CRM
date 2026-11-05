using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;

namespace GarageCRM
{
    static class Program
    {
        private const string HealthUrl = "http://localhost:5000/api/health";
        private const string AppUrl = "http://localhost:5000";

        [STAThread]
        static void Main()
        {
            try
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;

                // 1. Check if backend server is already running
                bool serverRunning = IsServerAlive(HealthUrl);

                if (!serverRunning)
                {
                    // Find node.exe
                    string nodeExe = FindNodeExecutable(baseDir);
                    string serverJs = FindServerScript(baseDir);

                    if (!string.IsNullOrEmpty(nodeExe) && !string.IsNullOrEmpty(serverJs) && File.Exists(serverJs))
                    {
                        ProcessStartInfo nodePsi = new ProcessStartInfo
                        {
                            FileName = nodeExe,
                            Arguments = "\"" + serverJs + "\"",
                            WorkingDirectory = Path.GetDirectoryName(serverJs),
                            CreateNoWindow = true,
                            UseShellExecute = false,
                            WindowStyle = ProcessWindowStyle.Hidden
                        };

                        Process.Start(nodePsi);

                        // Wait for server to become responsive (up to 12 seconds)
                        for (int i = 0; i < 40; i++)
                        {
                            Thread.Sleep(300);
                            if (IsServerAlive(HealthUrl))
                            {
                                serverRunning = true;
                                break;
                            }
                        }
                    }
                }

                // 2. Launch in standalone chromeless application mode via Edge
                string edgePath = FindEdgeExecutable();

                if (!string.IsNullOrEmpty(edgePath) && File.Exists(edgePath))
                {
                    ProcessStartInfo edgePsi = new ProcessStartInfo
                    {
                        FileName = edgePath,
                        Arguments = "--app=\"" + AppUrl + "\" --window-size=1440,900",
                        UseShellExecute = false
                    };
                    Process.Start(edgePsi);
                }
                else
                {
                    // Fallback to default browser
                    Process.Start(new ProcessStartInfo(AppUrl) { UseShellExecute = true });
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Error launching Garage CRM Suite:\n" + ex.Message,
                    "Garage CRM Suite",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        private static bool IsServerAlive(string url)
        {
            try
            {
                HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url);
                request.Method = "GET";
                request.Timeout = 1000;
                request.ReadWriteTimeout = 1000;
                using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
                {
                    return response.StatusCode == HttpStatusCode.OK;
                }
            }
            catch
            {
                return false;
            }
        }

        private static string FindNodeExecutable(string baseDir)
        {
            // Bundled node in engine\node.exe
            string bundled = Path.Combine(baseDir, "engine", "node.exe");
            if (File.Exists(bundled)) return bundled;

            // Direct in app root
            string rootNode = Path.Combine(baseDir, "node.exe");
            if (File.Exists(rootNode)) return rootNode;

            // Workspace parent fallback
            string parentBundled = Path.Combine(baseDir, "..", "engine", "node.exe");
            if (File.Exists(parentBundled)) return parentBundled;

            // Standard 64-bit Program Files
            string sysNode = @"C:\Program Files\nodejs\node.exe";
            if (File.Exists(sysNode)) return sysNode;

            // Standard 32-bit Program Files
            string sysNode32 = @"C:\Program Files (x86)\nodejs\node.exe";
            if (File.Exists(sysNode32)) return sysNode32;

            // Fallback to PATH
            return "node";
        }

        private static string FindServerScript(string baseDir)
        {
            string s1 = Path.Combine(baseDir, "backend", "server.js");
            if (File.Exists(s1)) return s1;

            string s2 = Path.Combine(baseDir, "..", "backend", "server.js");
            if (File.Exists(s2)) return s2;

            return null;
        }

        private static string FindEdgeExecutable()
        {
            string e1 = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
            if (File.Exists(e1)) return e1;

            string e2 = @"C:\Program Files\Microsoft\Edge\Application\msedge.exe";
            if (File.Exists(e2)) return e2;

            string userEdge = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                @"Microsoft\Edge\Application\msedge.exe"
            );
            if (File.Exists(userEdge)) return userEdge;

            return null;
        }
    }
}
