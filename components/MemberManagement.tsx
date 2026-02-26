
import React, { useState } from 'react';
import { X, UserPlus, Trash2, Mail, Shield, User as UserIcon, Check, AlertCircle, Key, FolderOpen, ArrowLeft } from 'lucide-react';
import { User, Business } from '../types';

const CRED_PW_KEY = 'terminal_pw_';
const CRED_USER_KEY = 'terminal_user_';

function saveCredentialsLocally(email: string, password: string | null, user: User): void {
  const e = email.trim().toLowerCase();
  if (password) localStorage.setItem(CRED_PW_KEY + e, password);
  localStorage.setItem(CRED_USER_KEY + e, JSON.stringify({ ...user, email: user.email }));
}

export function getLocalCredentials(email: string, password: string): User | null {
  const e = email.trim().toLowerCase();
  const storedPw = localStorage.getItem(CRED_PW_KEY + e);
  const storedUser = localStorage.getItem(CRED_USER_KEY + e);
  if (!storedPw || storedPw !== password || !storedUser) return null;
  try {
    const user = JSON.parse(storedUser) as User;
    return user?.email ? user : null;
  } catch {
    return null;
  }
}

interface MemberManagementProps {
  isOpen: boolean;
  onClose: () => void;
  managers: User[];
  businesses?: Business[];
  onAddManager: (manager: User) => void;
  onUpdateManager?: (id: string, updates: Partial<Pick<User, 'email' | 'permissions'>>) => void;
  onDeleteManager: (id: string) => void;
  /** Update business (e.g. set responsible) so manager sees assigned entities after login */
  onUpdateBusiness?: (updated: Business) => void;
}

export const MemberManagement: React.FC<MemberManagementProps> = ({
  isOpen,
  onClose,
  managers,
  businesses = [],
  onAddManager,
  onUpdateManager,
  onDeleteManager,
  onUpdateBusiness,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedManager, setSelectedManager] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isResettingCredentials, setIsResettingCredentials] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [credentialMessage, setCredentialMessage] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);

  // Form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleManagerClick = (manager: User) => {
    setSelectedManager(manager);
    setPermissions(manager.permissions || []);
    setResetEmail(manager.email);
    setResetPassword('');
    setCredentialMessage(null);
    setAssignedIds(new Set(businesses.filter(b => b.responsible?.toUpperCase() === manager.name.toUpperCase()).map(b => b.id)));
  };

  // Keep selected manager in sync with parent (so after save/credentials update the panel shows latest)
  React.useEffect(() => {
    if (!selectedManager) return;
    const updated = managers.find(m => m.id === selectedManager.id);
    if (updated && (updated.email !== selectedManager.email || JSON.stringify(updated.permissions || []) !== JSON.stringify(selectedManager.permissions || []))) {
      setSelectedManager(updated);
      setPermissions(updated.permissions || []);
      setResetEmail(updated.email);
    }
  }, [managers]);

  const togglePermission = (perm: string) => {
    setPermissions(prev =>
      prev.includes(perm)
        ? prev.filter(p => p !== perm)
        : [...prev, perm]
    );
  };

  const savePermissions = async () => {
    if (!selectedManager) return;
    setIsSaving(true);
    setCredentialMessage(null);
    onUpdateManager?.(selectedManager.id, { permissions });
    try {
      await import('../src/api/client').then(m => m.api.updateUserPermissions(selectedManager.id, permissions));
      setCredentialMessage('Permissions saved.');
      setTimeout(() => setCredentialMessage(null), 3000);
    } catch (e) {
      console.error('Failed to save permissions', e);
      setCredentialMessage('Permissions updated in this session. Save to server when connected.');
      setTimeout(() => setCredentialMessage(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateCredentials = async () => {
    if (!selectedManager) return;
    const newEmail = resetEmail.trim();
    const newPassword = resetPassword.trim();
    if (!newEmail && !newPassword) {
      setCredentialMessage('Enter new email or password.');
      return;
    }
    setIsResettingCredentials(true);
    setCredentialMessage(null);
    const managerEmail = selectedManager.email;
    const loginEmail = newEmail || managerEmail;

    try {
      if (newEmail) {
        onUpdateManager?.(selectedManager.id, { email: newEmail });
      }
      try {
        const { api } = await import('../src/api/client');
        await api.resetCredentialsByEmail(managerEmail, {
          ...(newEmail && { newEmail }),
          ...(newPassword && { newPassword }),
        });
      } catch (e) {
        if (newPassword || newEmail) {
          saveCredentialsLocally(loginEmail, newPassword || null, { ...selectedManager, email: loginEmail });
        }
        throw e;
      }
      if (newPassword) setResetPassword('');
      setCredentialMessage('Credentials saved. Manager can log in with the new password.');
      setTimeout(() => setCredentialMessage(null), 5000);
    } catch (e) {
      console.error('Reset credentials failed', e);
      if (newPassword || newEmail) {
        saveCredentialsLocally(loginEmail, newPassword || null, { ...selectedManager, email: loginEmail });
        setCredentialMessage('Password updated. Manager can log in with the new password on this device. Start the backend server to save to the database.');
      } else {
        setCredentialMessage('Could not save to server. Is the backend running?');
      }
      setTimeout(() => setCredentialMessage(null), 5000);
    } finally {
      setIsResettingCredentials(false);
      if (newPassword) setResetPassword('');
    }
  };


  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail || !newPassword) return;

    const email = newEmail.trim();
    const name = newName.trim();
    setAddError(null);
    setIsAddingUser(true);

    try {
      const created = await import('../src/api/client').then(m =>
        m.api.createUser({
          name,
          email,
          password: newPassword,
          avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(email)}`,
        })
      );
      onAddManager(created);
      if (created.permissions === undefined) (created as User).permissions = [];
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setIsAdding(false);
    } catch (err) {
      console.error('Create manager failed', err);
      setAddError('Could not save to server. Is the backend running? Add manager again after starting the server.');
      // Fallback: add locally so CXO sees the manager; they can set password again when backend is up
      const localManager: User = {
        id: `mgr-${Date.now()}`,
        name,
        role: 'Manager',
        email,
        avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(email)}`,
        lastLogin: 'Never',
        permissions: [],
      };
      onAddManager(localManager);
      if (newPassword) saveCredentialsLocally(email, newPassword, localManager);
    } finally {
      setIsAddingUser(false);
    }
  };

  const assignedBusinesses = selectedManager
    ? businesses.filter(b => assignedIds.has(b.id))
    : [];
  const unassignedBusinesses = selectedManager
    ? businesses.filter(b => !assignedIds.has(b.id))
    : [];
  const assignedCount = assignedBusinesses.length;
  const totalCount = businesses.length;

  const handleAssign = (biz: Business) => {
    if (!selectedManager || !onUpdateBusiness) return;
    onUpdateBusiness({ ...biz, responsible: selectedManager.name });
    setAssignedIds(prev => new Set([...prev, biz.id]));
  };

  const handleUnassign = (biz: Business) => {
    if (!onUpdateBusiness) {
      setAssignedIds(prev => { const n = new Set(prev); n.delete(biz.id); return n; });
      return;
    }
    onUpdateBusiness({ ...biz, responsible: 'NA' });
    setAssignedIds(prev => { const n = new Set(prev); n.delete(biz.id); return n; });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm z-[60]" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-[70] animate-in slide-in-from-right duration-300 flex flex-col">
        <header className="p-6 border-b border-zinc-100 dark:border-zinc-900 flex justify-between items-start bg-zinc-50/50 dark:bg-transparent">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
              Team Management
            </h2>
            <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-500 uppercase tracking-[0.2em] mt-1.5">Authorized CXO Access Only</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-colors text-zinc-500 dark:text-zinc-400">
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {selectedManager ? (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <button onClick={() => setSelectedManager(null)} className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1.5 transition-colors">
                <ArrowLeft size={16} /> Back to List
              </button>

              <div className="flex items-center gap-4 pb-5 border-b border-zinc-200 dark:border-zinc-800">
                <img src={selectedManager.avatar} className="w-14 h-14 rounded-full border-2 border-zinc-200 dark:border-zinc-700 object-cover" alt="" />
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{selectedManager.role}</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{selectedManager.email}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-[0.12em]">Access Control</h4>
                  <span className="text-[10px] font-medium px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                    {permissions.length} Active
                  </span>
                </div>
                <div className="space-y-2">
                  {[
                    { id: 'can_manage_team', label: 'Manage Team Members', desc: 'Can add or remove other managers' },
                    { id: 'can_delete_tasks', label: 'Delete Tasks', desc: 'Permanent deletion of tasks' },
                    { id: 'can_edit_business', label: 'Edit Business Profile', desc: 'Modify core business details and status' },
                    { id: 'can_view_financials', label: 'View Financial Data', desc: 'Access to sensitive financial modules' }
                  ].map(perm => {
                    const isActive = permissions.includes(perm.id);
                    return (
                      <button
                        key={perm.id}
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePermission(perm.id); }}
                        className={`w-full p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 text-left ${isActive ? 'bg-blue-50/80 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}`}
                      >
                        <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isActive ? 'bg-blue-500 border-blue-500' : 'border-zinc-300 dark:border-zinc-600'}`}>
                          {isActive && <Check size={10} className="text-white" strokeWidth={4} />}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-semibold ${isActive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-700 dark:text-zinc-300'}`}>{perm.label}</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{perm.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Key size={14} className="text-zinc-500 dark:text-zinc-400 shrink-0" />
                  <h4 className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-[0.12em]">Reset Credentials</h4>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Manager forgot password? Set new email and/or password here.</p>
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-[0.1em] block">New Email</label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    placeholder="manager@zeweco.com"
                    className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 px-4 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <label className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-[0.1em] block">New Password</label>
                  <input
                    type="password"
                    value={resetPassword}
                    onChange={e => setResetPassword(e.target.value)}
                    placeholder="Leave blank to keep current"
                    className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 px-4 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                {credentialMessage && (
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">{credentialMessage}</p>
                )}
                <button
                  type="button"
                  onClick={handleUpdateCredentials}
                  disabled={isResettingCredentials}
                  className="w-full py-3.5 bg-amber-400 hover:bg-amber-500 text-zinc-900 font-semibold text-sm rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResettingCredentials ? 'Updating...' : 'Update Email & Password'}
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <FolderOpen size={14} className="text-zinc-500 dark:text-zinc-400 shrink-0" />
                  <h4 className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-[0.12em]">Assigned Projects</h4>
                  <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400 ml-auto">{assignedCount} of {totalCount}</span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Only assigned businesses are visible to this manager in their login. Assign or unassign below.</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {assignedBusinesses.slice(0, 20).map(biz => (
                    <div key={biz.id} className="flex items-center justify-between gap-2 p-3 bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-4 h-4 rounded border border-zinc-300 dark:border-zinc-600 bg-blue-500 flex items-center justify-center shrink-0">
                          <Check size={10} className="text-white" strokeWidth={4} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{biz.name}</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">{biz.code} · {biz.stage}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUnassign(biz)}
                        className="shrink-0 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        Unassign
                      </button>
                    </div>
                  ))}
                </div>
                {unassignedBusinesses.length > 0 && (
                  <div className="space-y-1.5 mt-3">
                    <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">Assign project</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {unassignedBusinesses.slice(0, 15).map(biz => (
                        <div key={biz.id} className="flex items-center justify-between gap-2 p-2.5 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{biz.name}</p>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{biz.code}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAssign(biz)}
                            className="shrink-0 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            Assign
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={savePermissions}
                  disabled={isSaving}
                  className="w-full py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Updating...' : 'Save Permissions'}
                </button>
                <p className="text-[10px] text-center text-zinc-500 dark:text-zinc-400 mt-3">Changes propagate to manager&apos;s terminal immediately.</p>
              </div>
            </div>
          ) : !isAdding ? (
            <div className="space-y-6">
              <button
                onClick={() => setIsAdding(true)}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-500 hover:border-blue-500 hover:text-blue-500 transition-all text-sm font-bold"
              >
                <UserPlus size={18} />
                Provision New Manager
              </button>

              <div className="space-y-3">
                <h3 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Active Managers ({managers.length})</h3>
                {managers.map((mgr) => (
                  <div
                    key={mgr.id}
                    onClick={() => handleManagerClick(mgr)}
                    className="group flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800/60 rounded-2xl hover:border-blue-300 dark:hover:border-blue-700 hover:bg-white dark:hover:bg-zinc-900 hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img src={mgr.avatar} className="w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-700" alt="" />
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-zinc-950 rounded-full" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-900 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{mgr.name}</p>
                        <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{mgr.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {mgr.permissions && mgr.permissions.length > 0 && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-500 rounded-md">
                          {mgr.permissions.length} PERMS
                        </span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteManager(mgr.id); }}
                        className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleAdd} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setIsAdding(false)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                  <X size={20} />
                </button>
                <span className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">New Manager Account</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  <input
                    autoFocus
                    required
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">System Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  <input
                    required
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="name@zeweco.com"
                    className="w-full bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Initial Key-Code</label>
                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  <input
                    required
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {addError && (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">{addError}</p>
              )}
              <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/20 flex gap-3">
                <AlertCircle className="text-blue-500 shrink-0" size={18} />
                <p className="text-[10px] text-blue-600 dark:text-blue-400 leading-relaxed uppercase font-medium">Provisioning an account will generate a secure terminal uplink. The manager will be notified via Zeweco Intranet.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setAddError(null); }}
                  className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 py-3 rounded-xl text-xs font-bold transition-all"
                  disabled={isAddingUser}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingUser}
                  className="flex-1 bg-zinc-900 dark:bg-white text-white dark:text-black py-3 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isAddingUser ? 'Creating...' : <><Check size={16} /> Create User</>}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
};
