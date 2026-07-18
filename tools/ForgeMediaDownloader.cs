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
        private readonly Color bgColor = Color.FromArgb(10, 11, 16);
        private readonly Color panelColor = Color.FromArgb(20, 21, 30);
        private readonly Color inputColor = Color.FromArgb(24, 25, 35);
        private readonly Color borderColor = Color.FromArgb(38, 40, 56);
        private readonly Color textColor = Color.FromArgb(255, 255, 255);
        private readonly Color mutedColor = Color.FromArgb(124, 128, 155);
        private readonly Color accentColor = Color.FromArgb(255, 122, 26);
        private readonly Color accentDeepColor = Color.FromArgb(255, 140, 42);

        private readonly TextBox urlBox = new TextBox();
        private readonly ComboBox kindBox = new ComboBox();
        private readonly ComboBox qualityBox = new ComboBox();
        private readonly TextBox resourceBox = new TextBox();
        private readonly Button browseButton = new Button();
        private readonly Button downloadButton = new Button();
        private readonly Panel progressTrack = new Panel();
        private readonly Panel progressFill = new Panel();
        private readonly Label statusLabel = new Label();
        private readonly TextBox logBox = new TextBox();

        private Process currentProcess;

        public DownloaderForm()
        {
            Text = "Forgebox - Media Downloader";
            Width = 960;
            Height = 660;
            MinimumSize = new Size(860, 580);
            StartPosition = FormStartPosition.CenterScreen;
            BackColor = bgColor;
            ForeColor = textColor;
            Font = new Font("Segoe UI", 9.5F);

            var main = new TableLayoutPanel();
            main.Dock = DockStyle.Fill;
            main.BackColor = bgColor;
            main.Padding = new Padding(24);
            main.ColumnCount = 3;
            main.RowCount = 11;
            main.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 120));
            main.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
            main.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 150));
            Controls.Add(main);

            var header = BuildHeader();
            main.Controls.Add(header, 0, 0);
            main.SetColumnSpan(header, 3);

            var info = BuildInfoStrip();
            main.Controls.Add(info, 0, 1);
            main.SetColumnSpan(info, 3);

            AddLabel(main, "Resource", 2);
            resourceBox.Text = FindResourceRoot();
            StyleTextBox(resourceBox);
            var resourcePanel = CreateTextBoxPanel(resourceBox);
            resourcePanel.Anchor = AnchorStyles.Left | AnchorStyles.Right;
            resourcePanel.Height = 32;
            main.Controls.Add(resourcePanel, 1, 2);

            browseButton.Text = "Procurar";
            browseButton.Height = 32;
            browseButton.Anchor = AnchorStyles.Left | AnchorStyles.Right;
            StyleButton(browseButton, false);
            browseButton.Click += BrowseButton_Click;
            main.Controls.Add(browseButton, 2, 2);

            AddLabel(main, "Link", 3);
            StyleTextBox(urlBox);
            var urlPanel = CreateTextBoxPanel(urlBox);
            urlPanel.Anchor = AnchorStyles.Left | AnchorStyles.Right;
            urlPanel.Height = 32;
            main.Controls.Add(urlPanel, 1, 3);
            main.SetColumnSpan(urlPanel, 2);

            AddLabel(main, "Midia", 4);
            kindBox.Anchor = AnchorStyles.Left;
            kindBox.Width = 220;
            kindBox.Height = 32;
            kindBox.DropDownStyle = ComboBoxStyle.DropDownList;
            kindBox.BackColor = inputColor;
            kindBox.ForeColor = textColor;
            kindBox.FlatStyle = FlatStyle.Flat;
            kindBox.Items.Add("Video");
            kindBox.Items.Add("Musica");
            kindBox.SelectedIndex = 0;
            kindBox.Font = new Font("Segoe UI", 10F);
            kindBox.SelectedIndexChanged += delegate
            {
                qualityBox.Enabled = kindBox.SelectedIndex == 0;
            };
            main.Controls.Add(kindBox, 1, 4);

            AddLabel(main, "Qualidade", 5);
            qualityBox.Anchor = AnchorStyles.Left;
            qualityBox.Width = 220;
            qualityBox.Height = 32;
            qualityBox.DropDownStyle = ComboBoxStyle.DropDownList;
            qualityBox.BackColor = inputColor;
            qualityBox.ForeColor = textColor;
            qualityBox.FlatStyle = FlatStyle.Flat;
            qualityBox.Items.Add("720p (HD - Padrão)");
            qualityBox.Items.Add("1080p (Full HD)");
            qualityBox.Items.Add("360p (Baixa)");
            qualityBox.Items.Add("Melhor Disponível");
            qualityBox.SelectedIndex = 0;
            qualityBox.Font = new Font("Segoe UI", 10F);
            main.Controls.Add(qualityBox, 1, 5);

            downloadButton.Text = "Baixar agora";
            downloadButton.Height = 32;
            downloadButton.Anchor = AnchorStyles.Left | AnchorStyles.Right;
            StyleButton(downloadButton, true);
            downloadButton.Click += async delegate { await StartDownload(); };
            main.Controls.Add(downloadButton, 2, 5);

            progressTrack.Dock = DockStyle.Fill;
            progressTrack.BackColor = Color.FromArgb(22, 22, 26);
            progressTrack.Margin = new Padding(0, 10, 0, 10);
            progressTrack.Paint += delegate(object sender, PaintEventArgs e)
            {
                e.Graphics.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
                using (var path = GetRoundedRectPath(new Rectangle(0, 0, progressTrack.Width - 1, progressTrack.Height - 1), 4))
                {
                    using (var pen = new Pen(borderColor))
                    {
                        e.Graphics.DrawPath(pen, path);
                    }
                }
            };
            progressFill.BackColor = accentColor;
            progressFill.Width = 0;
            progressFill.Dock = DockStyle.Left;
            progressTrack.Controls.Add(progressFill);
            main.Controls.Add(progressTrack, 1, 6);
            main.SetColumnSpan(progressTrack, 2);

            statusLabel.Text = "Pronto para baixar midia para o Forge Loadscreen.";
            statusLabel.Dock = DockStyle.Fill;
            statusLabel.AutoSize = false;
            statusLabel.ForeColor = mutedColor;
            statusLabel.TextAlign = ContentAlignment.MiddleLeft;
            main.Controls.Add(statusLabel, 1, 7);
            main.SetColumnSpan(statusLabel, 2);

            var logTitle = BuildSectionTitle("Console", "saida do yt-dlp e atualizacao do config.json");
            main.Controls.Add(logTitle, 0, 8);
            main.SetColumnSpan(logTitle, 3);

            logBox.Dock = DockStyle.Fill;
            logBox.Multiline = true;
            logBox.ScrollBars = ScrollBars.Vertical;
            logBox.ReadOnly = true;
            logBox.Font = new Font("Consolas", 9.5F);
            StyleTextBox(logBox);
            logBox.BorderStyle = BorderStyle.None;

            var logPanel = CreateTextBoxPanel(logBox);
            logPanel.Dock = DockStyle.Fill;
            logPanel.Padding = new Padding(8);
            main.Controls.Add(logPanel, 0, 9);
            main.SetColumnSpan(logPanel, 3);

            var footer = BuildFooterLink();
            main.Controls.Add(footer, 0, 10);
            main.SetColumnSpan(footer, 3);

            main.RowStyles.Add(new RowStyle(SizeType.Absolute, 86));
            main.RowStyles.Add(new RowStyle(SizeType.Absolute, 70));
            main.RowStyles.Add(new RowStyle(SizeType.Absolute, 42));
            main.RowStyles.Add(new RowStyle(SizeType.Absolute, 42));
            main.RowStyles.Add(new RowStyle(SizeType.Absolute, 42));
            main.RowStyles.Add(new RowStyle(SizeType.Absolute, 42));
            main.RowStyles.Add(new RowStyle(SizeType.Absolute, 34));
            main.RowStyles.Add(new RowStyle(SizeType.Absolute, 32));
            main.RowStyles.Add(new RowStyle(SizeType.Absolute, 34));
            main.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            main.RowStyles.Add(new RowStyle(SizeType.Absolute, 26));
        }

        private Panel BuildHeader()
        {
            var header = new Panel();
            header.Dock = DockStyle.Fill;
            header.BackColor = panelColor;
            header.Padding = new Padding(18, 12, 18, 12);
            header.Paint += delegate(object sender, PaintEventArgs e)
            {
                e.Graphics.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
                using (var path = GetRoundedRectPath(new Rectangle(0, 0, header.Width - 1, header.Height - 1), 8))
                {
                    using (var brush = new SolidBrush(panelColor))
                    {
                        e.Graphics.FillPath(brush, path);
                    }
                    using (var pen = new Pen(borderColor))
                    {
                        e.Graphics.DrawPath(pen, path);
                    }
                    using (var accentBrush = new SolidBrush(accentColor))
                    {
                        e.Graphics.FillRectangle(accentBrush, 0, 0, 4, header.Height);
                    }
                }
            };

            var logo = new Label();
            logo.Text = "F";
            logo.BackColor = accentColor;
            logo.ForeColor = Color.White;
            logo.Font = new Font("Segoe UI Black", 14F, FontStyle.Bold);
            logo.TextAlign = ContentAlignment.MiddleCenter;
            logo.Location = new Point(22, 22);
            logo.Size = new Size(36, 36);
            logo.Paint += (s, e) =>
            {
                e.Graphics.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
                using (var path = GetRoundedRectPath(new Rectangle(0, 0, logo.Width, logo.Height), 8))
                {
                    using (var brush = new SolidBrush(accentColor))
                    {
                        e.Graphics.FillPath(brush, path);
                    }
                    TextRenderer.DrawText(
                        e.Graphics,
                        logo.Text,
                        logo.Font,
                        new Rectangle(0, 0, logo.Width, logo.Height),
                        logo.ForeColor,
                        TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter
                    );
                }
            };
            header.Controls.Add(logo);

            var eyebrow = new Label();
            eyebrow.Text = "LOADSCREEN MEDIA TOOL";
            eyebrow.AutoSize = false;
            eyebrow.Location = new Point(70, 16);
            eyebrow.Size = new Size(360, 18);
            eyebrow.ForeColor = mutedColor;
            eyebrow.Font = new Font("Segoe UI Semibold", 8.5F, FontStyle.Bold);
            header.Controls.Add(eyebrow);

            var title = new Label();
            title.Text = "Forge Media Downloader";
            title.AutoSize = false;
            title.Location = new Point(70, 35);
            title.Size = new Size(430, 30);
            title.ForeColor = textColor;
            title.Font = new Font("Segoe UI Semibold", 18F, FontStyle.Bold);
            header.Controls.Add(title);

            var subtitle = new Label();
            subtitle.Text = "Sincronize video e musica no config.json do Forge Loadscreen.";
            subtitle.AutoSize = false;
            subtitle.Location = new Point(505, 38);
            subtitle.Size = new Size(330, 22);
            subtitle.ForeColor = mutedColor;
            subtitle.Font = new Font("Segoe UI", 9F, FontStyle.Regular);
            header.Controls.Add(subtitle);

            var badge = new Label();
            badge.Text = "FORGEBOX";
            badge.AutoSize = false;
            badge.Location = new Point(header.Width - 128, 28);
            badge.Size = new Size(100, 24);
            badge.Anchor = AnchorStyles.Top | AnchorStyles.Right;
            badge.ForeColor = accentColor;
            badge.TextAlign = ContentAlignment.MiddleRight;
            badge.Font = new Font("Segoe UI Semibold", 9F, FontStyle.Bold);
            header.Controls.Add(badge);

            return header;
        }

        private Panel BuildInfoStrip()
        {
            var strip = new Panel();
            strip.Dock = DockStyle.Fill;
            strip.BackColor = bgColor;
            strip.Padding = new Padding(0, 14, 0, 12);

            var flow = new FlowLayoutPanel();
            flow.Dock = DockStyle.Fill;
            flow.WrapContents = false;
            flow.BackColor = bgColor;
            flow.Controls.Add(BuildChip("VIDEO", "MP4 para background", false));
            flow.Controls.Add(BuildChip("MUSICA", "WEBM para playlist", false));
            flow.Controls.Add(BuildChip("CONFIG", "backup automatico", true));
            strip.Controls.Add(flow);
            return strip;
        }

        private Panel BuildChip(string title, string description, bool success)
        {
            var chip = new Panel();
            chip.Width = 210;
            chip.Height = 44;
            chip.Margin = new Padding(0, 0, 12, 0);
            chip.BackColor = panelColor;
            chip.Padding = new Padding(12, 6, 12, 6);
            chip.Paint += delegate(object sender, PaintEventArgs e)
            {
                e.Graphics.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
                using (var path = GetRoundedRectPath(new Rectangle(0, 0, chip.Width - 1, chip.Height - 1), 6))
                {
                    using (var brush = new SolidBrush(panelColor))
                    {
                        e.Graphics.FillPath(brush, path);
                    }
                    using (var pen = new Pen(borderColor))
                    {
                        e.Graphics.DrawPath(pen, path);
                    }
                }
            };

            var titleLabel = new Label();
            titleLabel.Text = title;
            titleLabel.AutoSize = false;
            titleLabel.Location = new Point(12, 23);
            titleLabel.Size = new Size(160, 16);
            titleLabel.ForeColor = success ? Color.FromArgb(16, 185, 129) : accentColor;
            titleLabel.Font = new Font("Segoe UI Semibold", 8F, FontStyle.Bold);
            chip.Controls.Add(titleLabel);

            var descLabel = new Label();
            descLabel.Text = description;
            descLabel.AutoSize = false;
            descLabel.Location = new Point(12, 7);
            descLabel.Size = new Size(180, 16);
            descLabel.ForeColor = mutedColor;
            descLabel.Font = new Font("Segoe UI", 8F, FontStyle.Regular);
            chip.Controls.Add(descLabel);

            return chip;
        }

        private Panel BuildSectionTitle(string title, string subtitle)
        {
            var panel = new Panel();
            panel.Dock = DockStyle.Fill;
            panel.BackColor = bgColor;

            var label = new Label();
            label.Text = title;
            label.Dock = DockStyle.Left;
            label.Width = 110;
            label.TextAlign = ContentAlignment.MiddleLeft;
            label.ForeColor = textColor;
            label.Font = new Font("Segoe UI Semibold", 10F, FontStyle.Bold);
            panel.Controls.Add(label);

            var sub = new Label();
            sub.Text = subtitle;
            sub.Dock = DockStyle.Fill;
            sub.TextAlign = ContentAlignment.MiddleLeft;
            sub.ForeColor = mutedColor;
            sub.Font = new Font("Segoe UI", 8F, FontStyle.Regular);
            panel.Controls.Add(sub);

            return panel;
        }

        private Panel BuildFooterLink()
        {
            var footer = new Panel();
            footer.Dock = DockStyle.Fill;
            footer.BackColor = bgColor;

            var link = new LinkLabel();
            link.Text = "Forgebox UI Kit: https://pierremoraes-ofc.github.io/Forgebox-uikit/";
            link.Dock = DockStyle.Fill;
            link.TextAlign = ContentAlignment.MiddleRight;
            link.LinkColor = accentColor;
            link.ActiveLinkColor = accentDeepColor;
            link.VisitedLinkColor = accentColor;
            link.Font = new Font("Segoe UI", 8F, FontStyle.Regular);
            link.LinkClicked += delegate
            {
                Process.Start("https://pierremoraes-ofc.github.io/Forgebox-uikit/");
            };
            footer.Controls.Add(link);
            return footer;
        }

        private void AddLabel(TableLayoutPanel panel, string text, int row)
        {
            var label = new Label();
            label.Text = text;
            label.Dock = DockStyle.Fill;
            label.TextAlign = ContentAlignment.MiddleLeft;
            label.ForeColor = Color.FromArgb(188, 198, 210);
            label.Font = new Font("Segoe UI Semibold", 9F, FontStyle.Regular);
            panel.Controls.Add(label, 0, row);
        }

        private void StyleTextBox(TextBox box)
        {
            box.BackColor = inputColor;
            box.ForeColor = textColor;
            box.BorderStyle = BorderStyle.None;
            box.Margin = new Padding(0, 3, 0, 3);
        }

        private void StyleButton(Button button, bool primary)
        {
            button.FlatStyle = FlatStyle.Flat;
            button.FlatAppearance.BorderSize = 0;
            button.BackColor = primary ? accentColor : panelColor;
            button.ForeColor = Color.White;
            button.Font = new Font("Segoe UI Semibold", 9F, FontStyle.Bold);
            button.Cursor = Cursors.Hand;
            button.Height = 32;

            button.Paint += (sender, e) =>
            {
                e.Graphics.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
                var rect = new Rectangle(0, 0, button.Width - 1, button.Height - 1);
                using (var path = GetRoundedRectPath(rect, 6))
                {
                    using (var brush = new SolidBrush(button.BackColor))
                    {
                        e.Graphics.FillPath(brush, path);
                    }
                    using (var pen = new Pen(primary ? accentColor : borderColor))
                    {
                        e.Graphics.DrawPath(pen, path);
                    }
                }
                TextRenderer.DrawText(
                    e.Graphics,
                    button.Text,
                    button.Font,
                    rect,
                    button.ForeColor,
                    TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter
                );
            };

            button.MouseEnter += (s, e) =>
            {
                button.BackColor = primary ? accentDeepColor : Color.FromArgb(30, 31, 45);
            };
            button.MouseLeave += (s, e) =>
            {
                button.BackColor = primary ? accentColor : panelColor;
            };
        }

        private Panel CreateTextBoxPanel(Control innerControl)
        {
            var panel = new Panel();
            panel.Padding = new Padding(8, 7, 8, 7);
            panel.BackColor = innerControl.BackColor;

            innerControl.Dock = DockStyle.Fill;
            panel.Controls.Add(innerControl);

            panel.Paint += (sender, e) =>
            {
                e.Graphics.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
                using (var path = GetRoundedRectPath(new Rectangle(0, 0, panel.Width - 1, panel.Height - 1), 6))
                {
                    using (var pen = new Pen(borderColor))
                    {
                        e.Graphics.DrawPath(pen, path);
                    }
                }
            };

            return panel;
        }

        private System.Drawing.Drawing2D.GraphicsPath GetRoundedRectPath(Rectangle rect, int radius)
        {
            var path = new System.Drawing.Drawing2D.GraphicsPath();
            int nds = radius * 2;
            path.AddArc(rect.X, rect.Y, nds, nds, 180, 90);
            path.AddArc(rect.Right - nds, rect.Y, nds, nds, 270, 90);
            path.AddArc(rect.Right - nds, rect.Bottom - nds, nds, nds, 0, 90);
            path.AddArc(rect.X, rect.Bottom - nds, nds, nds, 90, 90);
            path.CloseFigure();
            return path;
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
                MessageBox.Show(this, "Ja existe um download em andamento.", "Forge Downloader", MessageBoxButtons.OK, MessageBoxIcon.Information);
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

            var ffmpegDir = Path.Combine(root, "tools");
            var ffmpegPath = Path.Combine(ffmpegDir, "ffmpeg.exe");
            bool hasFfmpeg = File.Exists(ffmpegPath);
            if (!hasFfmpeg)
            {
                try
                {
                    var psiCheck = new ProcessStartInfo("ffmpeg", "-version")
                    {
                        UseShellExecute = false,
                        CreateNoWindow = true,
                        RedirectStandardOutput = true
                    };
                    using (var p = Process.Start(psiCheck))
                    {
                        p.WaitForExit(2000);
                        hasFfmpeg = p.ExitCode == 0;
                    }
                }
                catch
                {
                    hasFfmpeg = false;
                }
            }

            var id = ExtractId(url);
            var title = GetMediaTitle(ytdlp, url);
            var folder = kind == "video" ? "videos" : "music";
            var ext = kind == "video" ? "mp4" : "webm";
            var timestamp = DateTime.Now.ToString("yyyyMMddHHmmss");
            var fileName = kind + "_" + id + "_" + timestamp + "." + ext;
            var configPath = "./" + folder + "/" + fileName;
            var distDir = Path.Combine(root, "ui", "dist", folder);
            var publicDir = Path.Combine(root, "ui", "public", folder);
            var distFile = Path.Combine(distDir, fileName);
            var publicFile = Path.Combine(publicDir, fileName);

            Directory.CreateDirectory(distDir);
            Directory.CreateDirectory(publicDir);

            logBox.Clear();
            SetProgress(0);
            statusLabel.Text = "Preparando download...";
            downloadButton.Enabled = false;

            var format = "best";
            if (kind == "video")
            {
                if (qualityBox.SelectedIndex == 0) // 720p
                {
                    format = "22/best[height<=720][ext=mp4]/best";
                }
                else if (qualityBox.SelectedIndex == 1) // 1080p
                {
                    if (hasFfmpeg)
                    {
                        format = "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/22/best";
                    }
                    else
                    {
                        format = "22/best[height<=720][ext=mp4]/best";
                        AppendLog("[AVISO] ffmpeg.exe nao encontrado em tools.");
                        AppendLog("Baixando em 720p (HD) automaticamente para evitar falha de mesclagem.");
                        AppendLog("Se desejar 1080p real, baixe o ffmpeg.exe e coloque na pasta tools.");
                        AppendLog("Link: https://github.com/BtbN/FFmpeg-Builds/releases");
                        AppendLog("");
                    }
                }
                else if (qualityBox.SelectedIndex == 2) // 360p
                {
                    format = "18/best[height<=360][ext=mp4]/best";
                }
                else // Best
                {
                    if (hasFfmpeg)
                    {
                        format = "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best";
                    }
                    else
                    {
                        format = "22/best[height<=720][ext=mp4]/best";
                        AppendLog("[AVISO] ffmpeg.exe nao encontrado em tools.");
                        AppendLog("Baixando em 720p (HD) automaticamente para evitar falha de mesclagem.");
                        AppendLog("Se desejar qualidade maxima com mesclagem, baixe o ffmpeg.exe e coloque na pasta tools.");
                        AppendLog("Link: https://github.com/BtbN/FFmpeg-Builds/releases");
                        AppendLog("");
                    }
                }
            }
            else // Music
            {
                format = "bestaudio[ext=webm]/bestaudio";
            }

            var args = "--newline --no-colors --no-playlist --format " + Quote(format);
            if (hasFfmpeg && File.Exists(ffmpegPath))
            {
                args += " --ffmpeg-location " + Quote(ffmpegDir);
            }
            args += " --output " + Quote(distFile) + " " + Quote(url);

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
                CleanupOldFiles(root, kind, fileName);
                SetProgress(100);
                statusLabel.Text = "Concluido. config.json atualizado com " + configPath;
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

            return "Forge " + (kindBox.SelectedIndex == 0 ? "Video" : "Musica");
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
                items.Clear(); // Limpar todos os videos anteriores

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
                tracks.Clear(); // Limpar todas as musicas anteriores

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

        private void SetProgress(int value)
        {
            var pct = Math.Max(0, Math.Min(100, value));
            if (progressTrack.Width <= 0)
            {
                progressFill.Width = 0;
                return;
            }
            progressFill.Width = (int)Math.Floor(progressTrack.Width * (pct / 100.0));
            progressFill.Invalidate();
            progressTrack.Invalidate();
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
                        SetProgress(pct);
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

        private void CleanupOldFiles(string root, string kind, string currentFileName)
        {
            try
            {
                var folder = kind == "video" ? "videos" : "music";
                var dirs = new[] {
                    Path.Combine(root, "ui", "dist", folder),
                    Path.Combine(root, "ui", "public", folder)
                };

                foreach (var dir in dirs)
                {
                    if (!Directory.Exists(dir)) continue;

                    var files = Directory.GetFiles(dir, kind + "_*");
                    foreach (var file in files)
                    {
                        var name = Path.GetFileName(file);
                        if (!string.Equals(name, currentFileName, StringComparison.OrdinalIgnoreCase))
                        {
                            try
                            {
                                File.Delete(file);
                            }
                            catch
                            {
                                // Silent skip if locked
                            }
                        }
                    }
                }
            }
            catch
            {
            }
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
