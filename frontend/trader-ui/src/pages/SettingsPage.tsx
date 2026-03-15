import { useState } from 'react';
import { Settings, Globe, Building2, Database, Shield, Bell, Palette, Save } from 'lucide-react';

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('general');

  const sections = [
    { key: 'general', label: 'General', icon: Settings },
    { key: 'company', label: 'Company', icon: Building2 },
    { key: 'localization', label: 'Localization', icon: Globe },
    { key: 'security', label: 'Security', icon: Shield },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'appearance', label: 'Appearance', icon: Palette },
    { key: 'system', label: 'System', icon: Database },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Configure your trader business system</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-56 shrink-0">
          <nav className="space-y-1">
            {sections.map((s) => (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  activeSection === s.key ? 'bg-brand-50 text-brand-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <s.icon className="w-4 h-4" />
                {s.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl">
          {activeSection === 'general' && (
            <div className="card p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">General Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">System Name</label>
                  <input type="text" defaultValue="Trader Business System" className="input-field w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Company</label>
                  <input type="text" defaultValue="Global Trading Company Ltd" className="input-field w-full" readOnly />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Items per Page</label>
                  <select className="input-field w-full">
                    <option>20</option>
                    <option>50</option>
                    <option>100</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 border-t">
                <button className="btn-primary flex items-center gap-2">
                  <Save className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </div>
          )}

          {activeSection === 'company' && (
            <div className="card p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Company Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input type="text" defaultValue="Global Trading Company Ltd" className="input-field w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Currency</label>
                  <input type="text" defaultValue="PKR" className="input-field w-full" readOnly />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID</label>
                  <input type="text" placeholder="NTN Number" className="input-field w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea rows={3} defaultValue="Office 301, Trade Tower, Mall Road, Lahore, Pakistan" className="input-field w-full" />
                </div>
              </div>
              <div className="pt-4 border-t">
                <button className="btn-primary flex items-center gap-2">
                  <Save className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </div>
          )}

          {activeSection === 'localization' && (
            <div className="card p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Localization</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input type="text" defaultValue="Pakistan" className="input-field w-full" readOnly />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
                  <select className="input-field w-full">
                    <option>dd-mm-yyyy</option>
                    <option>mm-dd-yyyy</option>
                    <option>yyyy-mm-dd</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Number Format</label>
                  <select className="input-field w-full">
                    <option>#,###.##</option>
                    <option>#.###,##</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fiscal Year Start</label>
                  <input type="text" defaultValue="July 1" className="input-field w-full" readOnly />
                </div>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="card p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Security</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Two-Factor Authentication</p>
                    <p className="text-xs text-gray-500">Require 2FA for all admin users</p>
                  </div>
                  <div className="w-10 h-5 bg-gray-300 rounded-full relative cursor-pointer">
                    <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm" />
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Session Timeout</p>
                    <p className="text-xs text-gray-500">Auto-logout after inactivity</p>
                  </div>
                  <select className="input-field w-32">
                    <option>30 min</option>
                    <option>1 hour</option>
                    <option>4 hours</option>
                    <option>8 hours</option>
                  </select>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Password Policy</p>
                    <p className="text-xs text-gray-500">Minimum password requirements</p>
                  </div>
                  <select className="input-field w-32">
                    <option>Standard</option>
                    <option>Strong</option>
                    <option>Custom</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="card p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
              <div className="space-y-3">
                {[
                  { label: 'New Sales Invoice', desc: 'When a new sales invoice is created' },
                  { label: 'Low Stock Alert', desc: 'When item stock falls below reorder level' },
                  { label: 'Payment Received', desc: 'When a payment is received from customer' },
                  { label: 'Overdue Invoice', desc: 'Daily digest of overdue invoices' },
                ].map((n) => (
                  <div key={n.label} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{n.label}</p>
                      <p className="text-xs text-gray-500">{n.desc}</p>
                    </div>
                    <div className="w-10 h-5 bg-brand-500 rounded-full relative cursor-pointer">
                      <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 right-0.5 shadow-sm" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'appearance' && (
            <div className="card p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Appearance</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Brand Color</label>
                  <div className="flex gap-3">
                    {['#1e40af', '#16a34a', '#dc2626', '#7c3aed', '#0891b2', '#ea580c'].map((color) => (
                      <button
                        key={color}
                        className="w-8 h-8 rounded-full border-2 border-gray-200 hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sidebar Style</label>
                  <select className="input-field w-full">
                    <option>Dark</option>
                    <option>Light</option>
                    <option>Colored</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'system' && (
            <div className="card p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">System Info</h2>
              <div className="space-y-3">
                {[
                  { label: 'ERPNext Version', value: 'v15.37.2' },
                  { label: 'Frappe Version', value: 'v15.47.4' },
                  { label: 'Trader App', value: 'v1.0.0' },
                  { label: 'Python', value: '3.11' },
                  { label: 'MariaDB', value: '10.11' },
                  { label: 'Redis', value: '7.x' },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-600">{s.label}</span>
                    <span className="text-sm font-medium text-gray-900 font-mono">{s.value}</span>
                  </div>
                ))}
              </div>
              <div className="pt-4">
                <button className="btn-secondary text-sm text-red-600 border-red-200 hover:bg-red-50">
                  Clear Cache
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
