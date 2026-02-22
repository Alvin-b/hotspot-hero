import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Copy, Wifi, Globe, FileCode, Monitor } from "lucide-react";
import { toast } from "sonner";

export default function RouterSetup() {
  const [portalUrl, setPortalUrl] = useState(window.location.origin);
  const [hotspotInterface, setHotspotInterface] = useState("ether2");
  const [hotspotAddress, setHotspotAddress] = useState("10.10.0.1");
  const [poolRange, setPoolRange] = useState("10.10.0.2-10.10.0.254");
  const [dnsName, setDnsName] = useState("hotspot.local");

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateRscScript = () => {
    const subnet = hotspotAddress.replace(/\.\d+$/, ".0");
    return `# MikroTik Hotspot + UserManager Configuration Script
# Generated for HotSpot WiFi Billing System
# Upload this file to your MikroTik router via Files, then run:
#   /import file-name=hotspot-setup.rsc

# ============================================
# 1. IP ADDRESS ON HOTSPOT INTERFACE
# ============================================
/ip address
add address=${hotspotAddress}/24 interface=${hotspotInterface} comment="Hotspot gateway"

# ============================================
# 2. IP POOL FOR HOTSPOT CLIENTS
# ============================================
/ip pool
add name=hotspot-pool ranges=${poolRange}

# ============================================
# 3. DHCP SERVER FOR HOTSPOT
# ============================================
/ip dhcp-server
add address-pool=hotspot-pool disabled=no interface=${hotspotInterface} name=dhcp-hotspot

/ip dhcp-server network
add address=${subnet}/24 dns-server=8.8.8.8,8.8.4.4 gateway=${hotspotAddress}

# ============================================
# 4. HOTSPOT SERVER PROFILE (UserManager)
# ============================================
/ip hotspot profile
add dns-name=${dnsName} hotspot-address=${hotspotAddress} \\
    login-by=http-chap,http-pap \\
    html-directory=hotspot name=hsprof-billing \\
    http-cookie-lifetime=1d \\
    use-radius=yes

# ============================================
# 5. HOTSPOT SERVER
# ============================================
/ip hotspot
add address-pool=hotspot-pool disabled=no interface=${hotspotInterface} \\
    name=hotspot-billing profile=hsprof-billing

# ============================================
# 6. RADIUS CLIENT -> UserManager (localhost)
# ============================================
/radius
add address=127.0.0.1 secret=usermanager service=hotspot timeout=3000ms

# ============================================
# 7. UserManager CONFIGURATION
# ============================================
# Enable UserManager RADIUS server
/tool user-manager
set enabled=yes

# Add the router as a RADIUS client in UserManager
/tool user-manager router
add address=127.0.0.1 shared-secret=usermanager name=hotspot-router

# ============================================
# 8. WALLED GARDEN - Allow portal before auth
# ============================================
/ip hotspot walled-garden ip
add action=accept disabled=no dst-host=${portalUrl.replace("https://", "").replace("http://", "")} comment="Billing portal"
add action=accept disabled=no dst-host=*.supabase.co comment="Backend API"

/ip hotspot walled-garden
add dst-host=${portalUrl.replace("https://", "").replace("http://", "")} path=/ action=allow
add dst-host=*.supabase.co action=allow

# ============================================
# 9. CAPTIVE PORTAL REDIRECT
# ============================================
/ip hotspot profile
set hsprof-billing login-by=http-chap,http-pap \\
    html-directory=hotspot \\
    login-url="${portalUrl}"

# ============================================
# 10. FIREWALL RULES
# ============================================
/ip firewall filter
add action=accept chain=input protocol=udp dst-port=1812-1813 \\
    comment="Allow RADIUS auth and accounting"
add action=accept chain=forward src-address=${subnet}/24 \\
    comment="Allow hotspot clients forward"

# ============================================
# 11. NAT
# ============================================
/ip firewall nat
add action=masquerade chain=srcnat out-interface-list=WAN \\
    comment="NAT for hotspot clients"

# ============================================
# DONE! Your hotspot with UserManager is configured.
# ============================================
# Next steps:
# 1. Upload the captive portal HTML to your router (Files > hotspot folder)
# 2. Add user profiles in UserManager or via the billing system
# 3. Test with a connection code from the admin dashboard
`;
  };

  const generateCaptivePortalHtml = () => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HotSpot WiFi - Connect</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafb;
      color: #1a2332;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .container {
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      padding: 32px 24px;
      max-width: 400px;
      width: 100%;
      text-align: center;
    }
    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .logo svg { width: 32px; height: 32px; color: #1a9a4a; }
    h1 { font-size: 22px; font-weight: 700; }
    .subtitle { color: #6b7a8d; font-size: 14px; margin-bottom: 24px; }
    .code-section { margin-bottom: 24px; }
    .code-section label { display: block; text-align: left; font-size: 14px; font-weight: 500; margin-bottom: 6px; }
    .code-input {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid #dde3ea;
      border-radius: 10px;
      font-size: 24px;
      text-align: center;
      letter-spacing: 6px;
      text-transform: uppercase;
      font-weight: 600;
      outline: none;
    }
    .code-input:focus { border-color: #1a9a4a; box-shadow: 0 0 0 3px rgba(26,154,74,0.15); }
    .btn-connect {
      width: 100%;
      padding: 14px;
      background: #1a9a4a;
      color: #fff;
      border: none;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      margin-bottom: 16px;
    }
    .btn-connect:hover { background: #158a3e; }
    .btn-connect:disabled { opacity: 0.5; cursor: not-allowed; }
    .divider { border-top: 1px solid #eee; margin: 20px 0; }
    .buy-link {
      display: inline-block;
      padding: 12px 24px;
      background: #f0f7f2;
      color: #1a9a4a;
      text-decoration: none;
      border-radius: 10px;
      font-weight: 600;
      font-size: 14px;
    }
    .buy-link:hover { background: #e0f0e5; }
    .status { margin-top: 12px; font-size: 13px; color: #6b7a8d; }
    .error { color: #e53e3e; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
        <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
        <line x1="12" y1="20" x2="12.01" y2="20"/>
      </svg>
      <h1>HotSpot WiFi</h1>
    </div>
    <p class="subtitle">Enter your connection code to get online</p>

    <!-- MikroTik Hotspot variables -->
    <form name="login" action="$(link-login-only)" method="post" onsubmit="return doLogin()">
      <input type="hidden" name="dst" value="$(link-orig)" />
      <input type="hidden" name="popup" value="true" />

      <div class="code-section">
        <label>Connection Code</label>
        <input type="text" name="username" id="codeInput" class="code-input"
               maxlength="5" placeholder="XXXXX" autocomplete="off" />
        <!-- Password is set to a fixed value; RADIUS validates the code (username) -->
        <input type="hidden" name="password" value="hotspot" />
      </div>

      <button type="submit" class="btn-connect" id="connectBtn">Connect</button>

      <div id="statusMsg" class="status"></div>
    </form>

    <div class="divider"></div>

    <p style="font-size:14px;color:#6b7a8d;margin-bottom:12px;">Don&rsquo;t have a code?</p>
    <a href="${portalUrl}" class="buy-link" target="_blank">Buy a Package &rarr;</a>

    $(if error)
    <div class="status error" style="margin-top:16px;">
      Login failed: $(error-orig). Please check your code and try again.
    </div>
    $(endif)
  </div>

  <script>
    var inp = document.getElementById('codeInput');
    inp.addEventListener('input', function() {
      this.value = this.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
    });
    function doLogin() {
      var code = inp.value.trim();
      if (code.length !== 5) {
        document.getElementById('statusMsg').textContent = 'Please enter a valid 5-letter code';
        document.getElementById('statusMsg').className = 'status error';
        return false;
      }
      document.getElementById('connectBtn').disabled = true;
      document.getElementById('connectBtn').textContent = 'Connecting...';
      return true;
    }
  </script>
</body>
</html>`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold">Router & UserManager Setup</h2>
        <p className="text-sm text-muted-foreground">
          Configure your MikroTik router with UserManager and download the captive portal page.
        </p>
      </div>

      {/* Configuration Inputs */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base">Configuration Settings</CardTitle>
          <CardDescription>Enter your network details to generate the configuration files</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Portal URL</label>
              <Input value={portalUrl} onChange={(e) => setPortalUrl(e.target.value)} placeholder="https://your-portal.lovable.app" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Hotspot Interface</label>
              <Input value={hotspotInterface} onChange={(e) => setHotspotInterface(e.target.value)} placeholder="ether2" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Hotspot Gateway IP</label>
              <Input value={hotspotAddress} onChange={(e) => setHotspotAddress(e.target.value)} placeholder="10.10.0.1" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">DHCP Pool Range</label>
              <Input value={poolRange} onChange={(e) => setPoolRange(e.target.value)} placeholder="10.10.0.2-10.10.0.254" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">DNS Name</label>
              <Input value={dnsName} onChange={(e) => setDnsName(e.target.value)} placeholder="hotspot.local" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="rsc">
        <TabsList className="w-full">
          <TabsTrigger value="rsc" className="flex-1 gap-2">
            <FileCode className="h-4 w-4" /> .rsc Script
          </TabsTrigger>
          <TabsTrigger value="portal" className="flex-1 gap-2">
            <Monitor className="h-4 w-4" /> Captive Portal HTML
          </TabsTrigger>
          <TabsTrigger value="instructions" className="flex-1 gap-2">
            <Globe className="h-4 w-4" /> Instructions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rsc">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-display text-base">MikroTik .rsc Script</CardTitle>
                <CardDescription>Full router + UserManager configuration</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => copyToClipboard(generateRscScript(), "Script")}>
                  <Copy className="mr-1 h-3 w-3" /> Copy
                </Button>
                <Button size="sm" onClick={() => downloadFile(generateRscScript(), "hotspot-setup.rsc")}>
                  <Download className="mr-1 h-3 w-3" /> Download .rsc
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-4 text-xs leading-relaxed">
                {generateRscScript()}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portal">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-display text-base">Captive Portal HTML</CardTitle>
                <CardDescription>Upload this as <code>login.html</code> in your router's hotspot folder</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => copyToClipboard(generateCaptivePortalHtml(), "HTML")}>
                  <Copy className="mr-1 h-3 w-3" /> Copy
                </Button>
                <Button size="sm" onClick={() => downloadFile(generateCaptivePortalHtml(), "login.html")}>
                  <Download className="mr-1 h-3 w-3" /> Download login.html
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-4 text-xs leading-relaxed">
                {generateCaptivePortalHtml()}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="instructions">
          <Card>
            <CardContent className="prose prose-sm max-w-none p-6">
              <div className="space-y-6">
                <section>
                  <h3 className="flex items-center gap-2 font-display text-base font-semibold">
                    <Wifi className="h-5 w-5 text-primary" /> Step 1: Import the .rsc Script
                  </h3>
                  <ol className="ml-4 list-decimal space-y-2 text-sm text-muted-foreground">
                    <li>Download the <strong>.rsc script</strong> from the ".rsc Script" tab</li>
                    <li>Open WinBox and connect to your MikroTik router</li>
                    <li>Go to <strong>Files</strong> → drag and drop <code>hotspot-setup.rsc</code></li>
                    <li>Open <strong>Terminal</strong> and run:
                      <code className="block rounded bg-muted px-2 py-1 mt-1">/import file-name=hotspot-setup.rsc</code>
                    </li>
                    <li>Verify the hotspot and UserManager are running:
                      <code className="block rounded bg-muted px-2 py-1 mt-1">/ip hotspot print</code>
                      <code className="block rounded bg-muted px-2 py-1 mt-1">/tool user-manager print</code>
                    </li>
                  </ol>
                </section>

                <section>
                  <h3 className="flex items-center gap-2 font-display text-base font-semibold">
                    <Monitor className="h-5 w-5 text-primary" /> Step 2: Upload Captive Portal Page
                  </h3>
                  <ol className="ml-4 list-decimal space-y-2 text-sm text-muted-foreground">
                    <li>Download the <strong>login.html</strong> from the "Captive Portal HTML" tab</li>
                    <li>In WinBox, go to <strong>Files</strong></li>
                    <li>Navigate into the <code>hotspot</code> folder (created by the script)</li>
                    <li>Drag and drop <code>login.html</code> to replace the default one</li>
                    <li>Users connecting to WiFi will now see your branded captive portal</li>
                  </ol>
                </section>

                <section>
                  <h3 className="flex items-center gap-2 font-display text-base font-semibold">
                    <Globe className="h-5 w-5 text-primary" /> Step 3: How It Works
                  </h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p><strong>User connects to WiFi</strong> → MikroTik hotspot intercepts → Shows captive portal login page</p>
                    <p><strong>User enters connection code</strong> → MikroTik sends to UserManager via RADIUS → Authenticates the user</p>
                    <p><strong>To buy a package</strong> → User clicks "Buy a Package" link → Redirected to your billing portal</p>
                    <p><strong>After M-PESA payment</strong> → System generates a 5-letter code → User enters code on captive portal</p>
                    <p><strong>Session expires</strong> → UserManager Session-Timeout kicks in → User disconnected automatically</p>
                  </div>
                </section>

                <section>
                  <h3 className="flex items-center gap-2 font-display text-base font-semibold">
                    <FileCode className="h-5 w-5 text-primary" /> Important Notes
                  </h3>
                  <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
                    <li>The <code>{hotspotInterface}</code> interface in the script should match your actual interface name</li>
                    <li>UserManager runs on the same router — no external RADIUS server needed</li>
                    <li>The captive portal page uses MikroTik hotspot variables (<code>$(link-login-only)</code>, etc.)</li>
                    <li>Connection codes are used as the RADIUS username; password is fixed as "hotspot"</li>
                    <li>Walled garden entries allow users to reach the billing portal before authenticating</li>
                    <li>You can later provide a sample .rsc file for a more customized configuration</li>
                  </ul>
                </section>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
