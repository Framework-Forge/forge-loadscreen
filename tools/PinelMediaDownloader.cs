using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Web.Script.Serialization;

namespace forgeLoadscreenTools
{
    public class DownloaderForm : Form
    {
        private readonly Color bgColor = Color.FromArgb(5, 8, 13);
        private readonly Color panelColor = Color.FromArgb(12, 17, 25);
        private readonly Color inputColor = Color.FromArgb(8, 12, 18);
        private readonly Color borderColor = Color.FromArgb(48, 61, 78);
        private readonly Color textColor = Color.FromArgb(238, 246, 255);
        private readonly Color mutedColor = Color.FromArgb(144, 160, 180);
        private readonly Color accentColor = Color.FromArgb(0, 170, 255);
        private readonly Color accentDeepColor = Color.FromArgb(0, 70, 110);

        private readonly TextBox urlBox = new TextBox();
        private readonly ComboBox kindBox = new ComboBox();
        private readonly TextBox resourceBox = new TextBox();
        private readonly Button browseButton = new Button();
        private readonly Button downloadButton = new Button();
        private readonly ProgressBar progressBar = new ProgressBar();
        private readonly Label statusLabel = new Label();
        private readonly TextBox logBox = new TextBox();

        private Process currentProcess;

        public DownloaderForm()
        {
            Text = "Forge Core - Loadscreen Downloader";
            Width = 860;
            Height = 600;
            MinimumSize = new Size(760, 520);
            StartPosition = FormStartPosition.CenterScreen;
            BackColor = bgColor;
            ForeColor = textColor;
            Font = new Font("Segoe UI", 9F);

            var main = new TableLayoutPanel();
            main.Dock = DockStyle.Fill;
            main.BackColor = bgColor;
            main.Padding = new Padding(18);
            main.ColumnCount = 3;
            main.RowCount = 9;
            main.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 130));
            main.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
            main.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 124));
            Controls.Add(main);

            var header = BuildHeader();
            main.Controls.Add(header, 0, 0);
            main.SetColumnSpan(header, 3);

            AddLabel(main, "Pasta resource", 1);
            resourceBox.Dock = DockStyle.Fill;
            resourceBox.Text = FindResourceRoot();
            StyleTextBox(resourceBox);
            main.Controls.Add(resourceBox, 1, 1);
            browseButton.Text = "Procurar";
            browseButton.Dock = DockStyle.Fill;
            StyleButton(browseButton, false);
            browseButton.Click += BrowseButton_Click;
            main.Controls.Add(browseButton, 2, 1);

            AddLabel(main, "Link", 2);
            urlBox.Dock = DockStyle.Fill;
            StyleTextBox(urlBox);
            main.Controls.Add(urlBox, 1, 2);
            main.SetColumnSpan(urlBox, 2);

            AddLabel(main, "Tipo", 3);
            kindBox.Dock = DockStyle.Left;
            kindBox.Width = 180;
            kindBox.DropDownStyle = ComboBoxStyle.DropDownList;
            kindBox.BackColor = inputColor;
            kindBox.ForeColor = textColor;
            kindBox.FlatStyle = FlatStyle.Flat;
            kindBox.Items.Add("Video");
            kindBox.Items.Add("Musica");
            kindBox.SelectedIndex = 0;
            main.Controls.Add(kindBox, 1, 3);

            downloadButton.Text = "Baixar";
            downloadButton.Width = 120;
            downloadButton.Height = 34;
            StyleButton(downloadButton, true);
            downloadButton.Click += async delegate { await StartDownload(); };
            main.Controls.Add(downloadButton, 2, 3);

            progressBar.Dock = DockStyle.Fill;
            progressBar.Minimum = 0;
            progressBar.Maximum = 100;
            main.Controls.Add(progressBar, 1, 4);
            main.SetColumnSpan(progressBar, 2);

            statusLabel.Text = "Pronto.";
            statusLabel.Dock = DockStyle.Fill;
            statusLabel.AutoSize = true;
            statusLabel.ForeColor = mutedColor;
            statusLabel.TextAlign = ContentAlignment.MiddleLeft;
            main.Controls.Add(statusLabel, 1, 5);
            main.SetColumnSpan(statusLabel, 2);

            logBox.Dock = DockStyle.Fill;
            logBox.Multiline = true;
            logBox.ScrollBars = ScrollBars.Vertical;
            logBox.ReadOnly = true;
            logBox.Font = new Font("Consolas", 9);
            StyleTextBox(logBox);
            logBox.BorderStyle = BorderStyle.FixedSingle;
            main.Controls.Add(logBox, 0, 6);
            main.SetColumnSpan(logBox, 3);
            main.SetRowSpan(logBox, 3);

            main.RowStyles.Add(new RowStyle(SizeType.Absolute, 96));
            main.RowStyles.Add(new RowStyle(SizeType.Absolute, 40));
            main.RowStyles.Add(new RowStyle(SizeType.Absolute, 40));
            main.RowStyles.Add(new RowStyle(SizeType.Absolute, 46));
            main.RowStyles.Add(new RowStyle(SizeType.Absolute, 30));
            main.RowStyles.Add(new RowStyle(SizeType.Absolute, 30));
            main.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            main.RowStyles.Add(new RowStyle(SizeType.Absolute, 1));
            main.RowStyles.Add(new RowStyle(SizeType.Absolute, 1));
        }

        private Panel BuildHeader()
        {
            var header = new Panel();
            header.Dock = DockStyle.Fill;
            header.BackColor = panelColor;
            header.Padding = new Padding(16, 12, 16, 12);

            var mark = new Label();
            mark.Text = "P";
            mark.BackColor = accentColor;
            mark.ForeColor = Color.White;
            mark.Font = new Font("Segoe UI Black", 22F, FontStyle.Bold);
            mark.TextAlign = ContentAlignment.MiddleCenter;
            mark.Width = 56;
            mark.Dock = DockStyle.Left;
            header.Controls.Add(mark);

            var titleWrap = new Panel();
            titleWrap.Dock = DockStyle.Fill;
            titleWrap.BackColor = panelColor;
            titleWrap.Padding = new Padding(16, 0, 0, 0);
            header.Controls.Add(titleWrap);

            var title = new Label();
            title.Text = "forge CORE";
            title.Dock = DockStyle.Top;
            title.Height = 34;
            title.ForeColor = textColor;
            title.Font = new Font("Segoe UI Black", 20F, FontStyle.Bold);
            titleWrap.Controls.Add(title);

            var subtitle = new Label();
            subtitle.Text = "Loadscreen media downloader";
            subtitle.Dock = DockStyle.Top;
            subtitle.Height = 24;
            subtitle.ForeColor = mutedColor;
            subtitle.Font = new Font("Segoe UI Semibold", 9F, FontStyle.Regular);
            titleWrap.Controls.Add(subtitle);

            var badge = new Label();
            badge.Text = "VIDEO + MUSICA";
            badge.Dock = DockStyle.Right;
            badge.Width = 130;
            badge.ForeColor = accentColor;
            badge.TextAlign = ContentAlignment.MiddleRight;
            badge.Font = new Font("Segoe UI Semibold", 9F, FontStyle.Bold);
            header.Controls.Add(badge);

            return header;
        }

        private void AddLabel(TableLayoutPanel panel, string text, int row)
        {
            var label = new Label();
            label.Text = text;
            label.Dock = DockStyle.Fill;
            label.TextAlign = ContentAlignment.MiddleLeft;
            label.ForeColor = mutedColor;
            label.Font = new Font("Segoe UI Semibold", 9F, FontStyle.Regular);
            panel.Controls.Add(label, 0, row);
        }

        private void StyleTextBox(TextBox box)
        {
            box.BackColor = inputColor;
            box.ForeColor = textColor;
            box.BorderStyle = BorderStyle.FixedSingle;
        }

        private void StyleButton(Button button, bool primary)
        {
            button.FlatStyle = FlatStyle.Flat;
            button.FlatAppearance.BorderSize = 1;
            button.FlatAppearance.BorderColor = primary ? accentColor : borderColor;
            button.BackColor = primary ? accentDeepColor : panelColor;
            button.ForeColor = primary ? Color.White : textColor;
            button.Font = new Font("Segoe UI Semibold", 9F, FontStyle.Bold);
        }

        private void BrowseButton_Click(object sender, EventArgs e)
        {
            using (var dialog = new FolderBrowserDialog())
            {
                dialog.Description = "Selecione a pasta forge-loadscreen";
                dialog.SelectedPath = Directory.Exists(resourceBox.Text) ? resourceBox.Text : "";
                if (dialog.ShowDialog(this) == DialogResult.OK)
                {
                    resourceBox.Text = dialog.SelectedPath;
                }
            }
        }

        private string FindResourceRoot()
        {
            var dir = AppDomain.CurrentDomain.BaseDirectory;
            for (int i = 0; i < 4 && !string.IsNullOrEmpty(dir); i++)
            {
                if (File.Exists(Path.Combine(dir, "fxmanifest.lua")))
                {
                    return dir.TrimEnd(Path.DirectorySeparatorChar);
                }

                var parent = Directory.GetParent(dir);
                dir = parent == null ? null : parent.FullName;
            }

            return AppDomain.CurrentDomain.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar);
        }

        private async Task StartDownload()
        {
            if (currentProcess != null && !currentProcess.HasExited)
            {
                MessageBox.Show(this, "Ja existe um download em andamento.", "Aguarde", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            var root = resourceBox.Text.Trim();
            var url = urlBox.Text.Trim();
            var kind = kindBox.SelectedIndex == 0 ? "video" : "music";

            if (!Directory.Exists(root) || !File.Exists(Path.Combine(root, "fxmanifest.lua")))
            {
                MessageBox.Show(this, "Selecione a pasta correta do resource forge-loadscreen.", "Pasta invalida", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            if (url.Length == 0)
            {
                MessageBox.Show(this, "Cole um link primeiro.", "Link vazio", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            var ytdlp = Path.Combine(root, "tools", "yt-dlp.exe");
            if (!File.Exists(ytdlp))
            {
                MessageBox.Show(this, "yt-dlp.exe nao encontrado em tools.", "Arquivo ausente", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            var id = ExtractId(url);
            var title = GetMediaTitle(ytdlp, url);
            var folder = kind == "video" ? "videos" : "music";
            var ext = kind == "video" ? "mp4" : "webm";
            var fileName = kind + "_" + id + "." + ext;
            var configPath = "./" + folder + "/" + fileName;
            var distDir = Path.Combine(root, "ui", "dist", folder);
            var publicDir = Path.Combine(root, "ui", "public", folder);
            var distFile = Path.Combine(distDir, fileName);
            var publicFile = Path.Combine(publicDir, fileName);

            Directory.CreateDirectory(distDir);
            Directory.CreateDirectory(publicDir);

            logBox.Clear();
            progressBar.Value = 0;
            statusLabel.Text = "Iniciando...";
            downloadButton.Enabled = false;

            var format = kind == "video" ? "18" : "bestaudio[ext=webm]/bestaudio";
            var args = "--newline --no-colors --no-playlist --format " + Quote(format) + " --output " + Quote(distFile) + " " + Quote(url);

            try
            {
                var ok = await RunYtDlp(ytdlp, args);
                if (!ok || !File.Exists(distFile))
                {
                    statusLabel.Text = "Falhou. Veja o log.";
                    return;
                }

                File.Copy(distFile, publicFile, true);
                UpdateConfig(root, kind, title, configPath);
                progressBar.Value = 100;
                statusLabel.Text = "Concluido e config.json atualizado: " + configPath;
                AppendLog("");
                AppendLog("Arquivo salvo em:");
                AppendLog(distFile);
                AppendLog(publicFile);
                AppendLog("config.json atualizado com: " + title);
            }
            catch (Exception ex)
            {
                statusLabel.Text = "Erro.";
                AppendLog(ex.Message);
            }
            finally
            {
                downloadButton.Enabled = true;
                currentProcess = null;
            }
        }

        private Task<bool> RunYtDlp(string exe, string args)
        {
            var tcs = new TaskCompletionSource<bool>();

            var psi = new ProcessStartInfo();
            psi.FileName = exe;
            psi.Arguments = args;
            psi.UseShellExecute = false;
            psi.CreateNoWindow = true;
            psi.RedirectStandardOutput = true;
            psi.RedirectStandardError = true;

            currentProcess = new Process();
            currentProcess.StartInfo = psi;
            currentProcess.EnableRaisingEvents = true;
            currentProcess.OutputDataReceived += delegate(object sender, DataReceivedEventArgs e) { HandleOutput(e.Data); };
            currentProcess.ErrorDataReceived += delegate(object sender, DataReceivedEventArgs e) { HandleOutput(e.Data); };
            currentProcess.Exited += delegate
            {
                BeginInvoke((Action)(delegate
                {
                    tcs.TrySetResult(currentProcess.ExitCode == 0);
                }));
            };

            currentProcess.Start();
            currentProcess.BeginOutputReadLine();
            currentProcess.BeginErrorReadLine();

            return tcs.Task;
        }

        private string GetMediaTitle(string ytdlp, string url)
        {
            try
            {
                var psi = new ProcessStartInfo();
                psi.FileName = ytdlp;
                psi.Arguments = "--no-playlist --print " + Quote("%(title)s") + " " + Quote(url);
                psi.UseShellExecute = false;
                psi.CreateNoWindow = true;
                psi.RedirectStandardOutput = true;
                psi.RedirectStandardError = true;

                using (var process = Process.Start(psi))
                {
                    var title = process.StandardOutput.ReadLine();
                    process.WaitForExit(15000);
                    if (!string.IsNullOrWhiteSpace(title))
                    {
                        return title.Trim();
                    }
                }
            }
            catch
            {
            }

            return "forge " + (kindBox.SelectedIndex == 0 ? "Video" : "Musica");
        }

        private void UpdateConfig(string root, string kind, string title, string mediaPath)
        {
            var configFile = Path.Combine(root, "config.json");
            if (!File.Exists(configFile))
            {
                AppendLog("config.json nao encontrado; arquivo baixado, mas config nao foi alterado.");
                return;
            }

            var backupFile = Path.Combine(root, "config.downloader-backup.json");
            File.Copy(configFile, backupFile, true);

            var serializer = new JavaScriptSerializer();
            serializer.MaxJsonLength = int.MaxValue;

            var raw = File.ReadAllText(configFile);
            var config = serializer.DeserializeObject(raw) as Dictionary<string, object>;
            if (config == null) config = new Dictionary<string, object>();

            if (kind == "video")
            {
                var backgroundMedia = GetOrCreateObject(config, "backgroundMedia");
                var items = GetOrCreateArray(backgroundMedia, "items");
                RemoveExisting(items, mediaPath);

                var item = new Dictionary<string, object>();
                item["src"] = mediaPath;
                item["muted"] = false;
                item["title"] = title;
                item["type"] = "video";
                item["duration"] = 42;
                items.Add(item);

                backgroundMedia["enabled"] = true;
                backgroundMedia["mode"] = "playlist";
                config["VideoEnabled"] = true;
                config["videoSource"] = mediaPath;
                config["videoType"] = "video";
            }
            else
            {
                var tracks = GetOrCreateArray(config, "musicTracks");
                RemoveExisting(tracks, mediaPath);

                var track = new Dictionary<string, object>();
                track["artist"] = "";
                track["src"] = mediaPath;
                track["cover"] = "./images/music/default.png";
                track["name"] = title;
                track["type"] = "audio";
                track["album"] = "";
                tracks.Add(track);

                config["MusicEnabled"] = true;
                config["musicSourceMode"] = "playlist";
                if (!config.ContainsKey("musicVolume")) config["musicVolume"] = 0.6;
            }

            var json = serializer.Serialize(config);
            File.WriteAllText(configFile, json, new UTF8Encoding(false));
            AppendLog("Backup criado: " + backupFile);
        }

        private Dictionary<string, object> GetOrCreateObject(Dictionary<string, object> parent, string key)
        {
            object value;
            if (parent.TryGetValue(key, out value))
            {
                var existing = value as Dictionary<string, object>;
                if (existing != null) return existing;
            }

            var created = new Dictionary<string, object>();
            parent[key] = created;
            return created;
        }

        private ArrayList GetOrCreateArray(Dictionary<string, object> parent, string key)
        {
            object value;
            if (parent.TryGetValue(key, out value))
            {
                var existing = value as ArrayList;
                if (existing != null) return existing;
            }

            var created = new ArrayList();
            parent[key] = created;
            return created;
        }

        private void RemoveExisting(ArrayList list, string mediaPath)
        {
            for (int i = list.Count - 1; i >= 0; i--)
            {
                var item = list[i] as Dictionary<string, object>;
                if (item == null || !item.ContainsKey("src")) continue;
                if (string.Equals(Convert.ToString(item["src"]), mediaPath, StringComparison.OrdinalIgnoreCase))
                {
                    list.RemoveAt(i);
                }
            }
        }

        private void HandleOutput(string line)
        {
            if (line == null) return;
            BeginInvoke((Action)(delegate
            {
                AppendLog(line);

                var match = Regex.Match(line, @"\[download\]\s+(\d+(?:\.\d+)?)%");
                if (match.Success)
                {
                    double value;
                    if (double.TryParse(match.Groups[1].Value, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out value))
                    {
                        var pct = Math.Max(0, Math.Min(100, (int)Math.Floor(value)));
                        progressBar.Value = pct;
                        statusLabel.Text = "Baixando... " + pct + "%";
                    }
                }
            }));
        }

        private void AppendLog(string line)
        {
            logBox.AppendText(line + Environment.NewLine);
        }

        private string ExtractId(string url)
        {
            var match = Regex.Match(url, @"(?:v=|youtu\.be/|embed/)([A-Za-z0-9_-]{11})");
            if (match.Success) return SafeName(match.Groups[1].Value);
            return DateTime.Now.ToString("yyyyMMdd_HHmmss");
        }

        private string SafeName(string value)
        {
            return Regex.Replace(value, @"[^A-Za-z0-9_-]", "_");
        }

        private static string Quote(string value)
        {
            return "\"" + value.Replace("\"", "\\\"") + "\"";
        }

        [STAThread]
        public static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new DownloaderForm());
        }
    }
}
