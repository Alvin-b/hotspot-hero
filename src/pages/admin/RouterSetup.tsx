import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Copy, CheckCircle, Server, Wifi, Globe, Shield } from "lucide-react";
import { toast } from "sonner";

export default function RouterSetup() {
  const [portalUrl, setPortalUrl] = useState(window.location.origin);
  const [radiusServer, setRadiusServer] = useState("");
  const [radiusSecret, setRadiusSecret] = useState("testing123");
  const [dbHost, setDbHost] = useState("olskgugybbnoouvyblbl.supabase.co");
  const [dbPort, setDbPort] = useState("5432");
  const [dbName, setDbName] = useState("postgres");
  const [dbUser, setDbUser] = useState("postgres");
  const [dbPassword, setDbPassword] = useState("");

  const generateRscScript = () => {
    return `# MikroTik Hotspot + RADIUS Configuration Script
# Generated for HotSpot WiFi Billing System
# Upload this file to your MikroTik router via Files, then run:
#   /import file-name=hotspot-setup.rsc

# ============================================
# 1. RADIUS CLIENT CONFIGURATION
# ============================================
/radius
add address=${radiusServer || "YOUR_RADIUS_SERVER_IP"} secret=${radiusSecret} service=hotspot timeout=3000ms

# Enable RADIUS for hotspot
/ip hotspot profile
set default use-radius=yes

# ============================================
# 2. HOTSPOT SERVER CONFIGURATION  
# ============================================
# Note: Adjust interface and address-pool to match your network

# Create IP pool for hotspot clients
/ip pool
add name=hotspot-pool ranges=10.10.0.2-10.10.0.254

# Set up DHCP for hotspot
/ip dhcp-server
add address-pool=hotspot-pool disabled=no interface=bridge-hotspot name=dhcp-hotspot

/ip dhcp-server network
add address=10.10.0.0/24 dns-server=8.8.8.8,8.8.4.4 gateway=10.10.0.1

# ============================================
# 3. HOTSPOT SETUP
# ============================================
/ip hotspot profile
add dns-name=hotspot.local hotspot-address=10.10.0.1 login-by=http-chap,http-pap \\
    html-directory=hotspot name=hsprof-billing \\
    http-cookie-lifetime=1d use-radius=yes

/ip hotspot
add address-pool=hotspot-pool disabled=no interface=bridge-hotspot \\
    name=hotspot-billing profile=hsprof-billing

# ============================================
# 4. WALLED GARDEN - Allow access to portal
# ============================================
# Allow access to the billing portal before authentication
/ip hotspot walled-garden ip
add action=accept disabled=no dst-host=${portalUrl.replace("https://", "").replace("http://", "")}
add action=accept disabled=no dst-host=*.supabase.co

/ip hotspot walled-garden
add dst-host=${portalUrl.replace("https://", "").replace("http://", "")} path=/ action=allow
add dst-host=*.supabase.co action=allow

# ============================================
# 5. REDIRECT TO CAPTIVE PORTAL
# ============================================
# The hotspot will automatically redirect unauthenticated users
# Set the login URL to your billing portal
/ip hotspot profile
set hsprof-billing login-by=http-chap,http-pap \\
    html-directory=hotspot \\
    login-url="${portalUrl}"

# ============================================
# 6. FIREWALL RULES
# ============================================
/ip firewall filter
add action=accept chain=input protocol=udp dst-port=1812-1813 \\
    comment="Allow RADIUS auth and accounting"
add action=accept chain=forward src-address=10.10.0.0/24 \\
    comment="Allow hotspot clients forward"

# ============================================
# 7. NAT (if not already configured)
# ============================================
/ip firewall nat
add action=masquerade chain=srcnat out-interface-list=WAN \\
    comment="NAT for hotspot clients"

# ============================================
# DONE! Your hotspot is configured.
# ============================================
# Next steps:
# 1. Configure FreeRADIUS to connect to your database
# 2. Test with a connection code from the admin dashboard
# 3. Verify users can access the captive portal
`;
  };

  const generateFreeRadiusConfig = () => {
    return `# FreeRADIUS SQL Configuration
# File: /etc/freeradius/3.0/mods-enabled/sql
#
# This configures FreeRADIUS to authenticate users
# against your Lovable Cloud PostgreSQL database

sql {
    driver = "rlm_sql_postgresql"
    dialect = "postgresql"

    server = "${dbHost}"
    port = ${dbPort}
    login = "${dbUser}"
    password = "${dbPassword || "YOUR_DB_PASSWORD"}"
    
    radius_db = "${dbName}"

    # Table names (match your database schema)
    authcheck_table = "radcheck"
    authreply_table = "radreply"
    
    # Leave these empty since we don't use them
    acct_table1 = "radacct"
    acct_table2 = "radacct"
    postauth_table = "radpostauth"
    
    groupcheck_table = "radgroupcheck"
    groupreply_table = "radgroupreply"
    usergroup_table = "radusergroup"

    delete_stale_sessions = yes
    
    pool {
        start = 5
        min = 3
        max = 10
        spare = 3
        uses = 0
        lifetime = 0
        idle_timeout = 60
    }

    read_clients = no

    # Custom authorize query
    authorize_check_query = "SELECT id, username, attribute, value, op FROM radcheck WHERE username = '%{SQL-User-Name}' ORDER BY id"
    authorize_reply_query = "SELECT id, username, attribute, value, op FROM radreply WHERE username = '%{SQL-User-Name}' ORDER BY id"
}

# Enable SQL in the server config
# File: /etc/freeradius/3.0/sites-enabled/default
# In the authorize section, uncomment: sql
# In the authenticate section, add: Auth-Type PAP { pap }
# In the post-auth section, uncomment: sql
# In the accounting section, uncomment: sql
`;
  };

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold">Router & RADIUS Setup</h2>
        <p className="text-sm text-muted-foreground">
          Configure your MikroTik router and FreeRADIUS server to work with this billing system.
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
              <label className="mb-1 block text-sm font-medium">RADIUS Server IP</label>
              <Input value={radiusServer} onChange={(e) => setRadiusServer(e.target.value)} placeholder="192.168.1.100" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">RADIUS Shared Secret</label>
              <Input value={radiusSecret} onChange={(e) => setRadiusSecret(e.target.value)} placeholder="testing123" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Database Host</label>
              <Input value={dbHost} onChange={(e) => setDbHost(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Database Password</label>
              <Input type="password" value={dbPassword} onChange={(e) => setDbPassword(e.target.value)} placeholder="Your DB password" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Database User</label>
              <Input value={dbUser} onChange={(e) => setDbUser(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="mikrotik">
        <TabsList className="w-full">
          <TabsTrigger value="mikrotik" className="flex-1 gap-2">
            <Wifi className="h-4 w-4" /> MikroTik Script
          </TabsTrigger>
          <TabsTrigger value="freeradius" className="flex-1 gap-2">
            <Server className="h-4 w-4" /> FreeRADIUS Config
          </TabsTrigger>
          <TabsTrigger value="instructions" className="flex-1 gap-2">
            <Globe className="h-4 w-4" /> Instructions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mikrotik">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-display text-base">MikroTik .rsc Script</CardTitle>
                <CardDescription>Upload this to your router via Files, then import it</CardDescription>
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

        <TabsContent value="freeradius">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-display text-base">FreeRADIUS SQL Config</CardTitle>
                <CardDescription>Place this in /etc/freeradius/3.0/mods-enabled/sql</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => copyToClipboard(generateFreeRadiusConfig(), "Config")}>
                  <Copy className="mr-1 h-3 w-3" /> Copy
                </Button>
                <Button size="sm" onClick={() => downloadFile(generateFreeRadiusConfig(), "sql-config.conf")}>
                  <Download className="mr-1 h-3 w-3" /> Download
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-4 text-xs leading-relaxed">
                {generateFreeRadiusConfig()}
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
                    <Shield className="h-5 w-5 text-primary" /> Step 1: Set Up FreeRADIUS
                  </h3>
                  <ol className="ml-4 list-decimal space-y-2 text-sm text-muted-foreground">
                    <li>Install FreeRADIUS on your Linux server:
                      <code className="block rounded bg-muted px-2 py-1 mt-1">sudo apt install freeradius freeradius-postgresql</code>
                    </li>
                    <li>Download the SQL config from the "FreeRADIUS Config" tab above</li>
                    <li>Replace <code>/etc/freeradius/3.0/mods-enabled/sql</code> with the downloaded config</li>
                    <li>Enable SQL module:
                      <code className="block rounded bg-muted px-2 py-1 mt-1">cd /etc/freeradius/3.0/mods-enabled && ln -s ../mods-available/sql sql</code>
                    </li>
                    <li>Edit <code>/etc/freeradius/3.0/sites-enabled/default</code>:
                      <ul className="ml-4 mt-1 list-disc space-y-1">
                        <li>In <code>authorize</code> section, uncomment <code>sql</code></li>
                        <li>In <code>accounting</code> section, uncomment <code>sql</code></li>
                        <li>In <code>post-auth</code> section, uncomment <code>sql</code></li>
                      </ul>
                    </li>
                    <li>Configure RADIUS clients in <code>/etc/freeradius/3.0/clients.conf</code>:
                      <pre className="mt-1 rounded bg-muted p-2 text-xs">{`client mikrotik {
    ipaddr = YOUR_ROUTER_IP
    secret = ${radiusSecret}
    shortname = mikrotik-hotspot
}`}</pre>
                    </li>
                    <li>Restart FreeRADIUS:
                      <code className="block rounded bg-muted px-2 py-1 mt-1">sudo systemctl restart freeradius</code>
                    </li>
                    <li>Test with:
                      <code className="block rounded bg-muted px-2 py-1 mt-1">radtest hs-ABCDE password123 localhost 0 testing123</code>
                    </li>
                  </ol>
                </section>

                <section>
                  <h3 className="flex items-center gap-2 font-display text-base font-semibold">
                    <Wifi className="h-5 w-5 text-primary" /> Step 2: Configure MikroTik Router
                  </h3>
                  <ol className="ml-4 list-decimal space-y-2 text-sm text-muted-foreground">
                    <li>Download the <strong>.rsc script</strong> from the "MikroTik Script" tab</li>
                    <li>Open WinBox and connect to your router</li>
                    <li>Go to <strong>Files</strong> → drag and drop <code>hotspot-setup.rsc</code></li>
                    <li>Open <strong>Terminal</strong> and run:
                      <code className="block rounded bg-muted px-2 py-1 mt-1">/import file-name=hotspot-setup.rsc</code>
                    </li>
                    <li>Verify the hotspot is running:
                      <code className="block rounded bg-muted px-2 py-1 mt-1">/ip hotspot print</code>
                    </li>
                    <li>Check RADIUS is configured:
                      <code className="block rounded bg-muted px-2 py-1 mt-1">/radius print</code>
                    </li>
                  </ol>
                </section>

                <section>
                  <h3 className="flex items-center gap-2 font-display text-base font-semibold">
                    <Globe className="h-5 w-5 text-primary" /> Step 3: How It Works
                  </h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p><strong>User connects to WiFi</strong> → MikroTik hotspot intercepts → Redirects to your captive portal</p>
                    <p><strong>User selects package</strong> → Pays via M-PESA → System generates 5-letter code</p>
                    <p><strong>User enters code</strong> → System validates → MikroTik authenticates via RADIUS → User gets internet</p>
                    <p><strong>Session expires</strong> → RADIUS Session-Timeout kicks in → User disconnected automatically</p>
                  </div>
                </section>

                <section>
                  <h3 className="flex items-center gap-2 font-display text-base font-semibold">
                    <Server className="h-5 w-5 text-primary" /> Important Notes
                  </h3>
                  <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
                    <li>The <code>bridge-hotspot</code> interface in the script should match your actual bridge/interface name</li>
                    <li>Adjust the IP pool range (<code>10.10.0.0/24</code>) to match your network</li>
                    <li>Ensure your FreeRADIUS server can reach the database (allow in firewall)</li>
                    <li>The RADIUS username format is <code>hs-XXXXX</code> where XXXXX is the connection code</li>
                    <li>Walled garden entries allow users to access the portal before authenticating</li>
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
