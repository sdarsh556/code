import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
    Users, UserPlus, Trash2,
    ShieldCheck, ShieldAlert, Eye, Clock, Wrench, BarChart3,
    CheckCircle2, AlertCircle, X, Search,
    Loader2, Mail, UserCircle2,
    Pencil, Shield,
} from 'lucide-react';
import '../../css/home/AccountTab.css';

/* ─── Theme-aware portal — syncs data-theme from .layout-container ── */
function useTheme() {
    const [theme, setTheme] = useState(() => {
        return document.querySelector('.layout-container')?.dataset?.theme || 'light';
    });
    useEffect(() => {
        const el = document.querySelector('.layout-container');
        if (!el) return;
        const obs = new MutationObserver(() => {
            setTheme(el.dataset?.theme || 'light');
        });
        obs.observe(el, { attributes: true, attributeFilter: ['data-theme'] });
        return () => obs.disconnect();
    }, []);
    return theme;
}

function ThemePortal({ children }) {
    const theme = useTheme();
    return ReactDOM.createPortal(
        <div className="layout-container acc-portal-root" data-theme={theme}>
            {children}
        </div>,
        document.body
    );
}

/* ─── Role Categories with Colors & Icons ─────────────────── */
const ROLE_CATEGORIES = {
    admin: {
        icon: ShieldAlert,
        color: '#F87171',
        bg: 'rgba(248,113,113,0.13)',
        border: 'rgba(248,113,113,0.35)',
        desc: 'Administrative access',
    },
    manager: {
        icon: Wrench,
        color: '#60A5FA',
        bg: 'rgba(96,165,250,0.13)',
        border: 'rgba(96,165,250,0.35)',
        desc: 'Resource management access',
    },
    analytics: {
        icon: BarChart3,
        color: '#A78BFA',
        bg: 'rgba(167,139,250,0.13)',
        border: 'rgba(167,139,250,0.35)',
        desc: 'Analytics and reporting access',
    },
    read_only: {
        icon: Eye,
        color: '#34D399',
        bg: 'rgba(52,211,153,0.13)',
        border: 'rgba(52,211,153,0.35)',
        desc: 'Read-only access',
    },
};

/* ─── Categorize role by name ────────────────────────────── */
function getCategoryForRole(roleName) {
    const name = (roleName || '').toLowerCase();
    if (name.includes('admin')) return 'admin';
    if (name.includes('manager')) return 'manager';
    if (name.includes('analytics')) return 'analytics';
    if (name.includes('read') || name.includes('viewer') || name.includes('readonly')) return 'read_only';
    return 'manager'; // default fallback
}

/* ─── Get role display config ────────────────────────────── */
function getRoleConfig(roleName) {
    const category = getCategoryForRole(roleName);
    const config = ROLE_CATEGORIES[category];
    return {
        ...config,
        label: formatRoleName(roleName),
        value: roleName,
    };
}

/* ─── Format role name for display ───────────────────────── */
function formatRoleName(roleName) {
    return (roleName || '')
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/* ─── Mock users (roles is now an array) ─────────────────── */
const MOCK_USERS = [
    { id: 1, name: 'Darsh Shah', email: 'darsh@company.com', roles: ['super_admin'], lastSignedIn: '2026-04-19T06:00:00Z' },
    { id: 2, name: 'Priya Mehta', email: 'priya.mehta@company.com', roles: ['ec2_manager', 'ecs_manager'], lastSignedIn: '2026-04-18T14:22:00Z' },
    { id: 3, name: 'Rahul Joshi', email: 'rahul.j@company.com', roles: ['read_only'], lastSignedIn: '2026-04-17T09:15:00Z' },
    { id: 4, name: 'Ananya Kapoor', email: 'ananya@company.com', roles: ['analytics_viewer'], lastSignedIn: '2026-04-15T16:45:00Z' },
    { id: 5, name: 'Siddharth Nair', email: 'sid.nair@company.com', roles: ['rds_manager'], lastSignedIn: '2026-04-12T11:30:00Z' },
];

/* ─── Available Roles (from backend) ──────────────────────── */
const AVAILABLE_ROLES = [
    { role_id: 1, role_name: 'super_admin', description: 'Full system access with all permissions' },
    { role_id: 9, role_name: 'admin', description: 'Full access to all modules except admin-specific operations' },
    { role_id: 3, role_name: 'ec2_manager', description: 'Full EC2 operations and analytics access' },
    { role_id: 4, role_name: 'ecs_manager', description: 'Full ECS operations and analytics access' },
    { role_id: 5, role_name: 'eks_manager', description: 'Full EKS operations and analytics access' },
    { role_id: 6, role_name: 'rds_manager', description: 'Full RDS operations and analytics access' },
    { role_id: 7, role_name: 'asg_manager', description: 'Full ASG operations and analytics access' },
    { role_id: 8, role_name: 'analytics_viewer', description: 'Analytics read-only access' },
    { role_id: 2, role_name: 'read_only', description: 'Read-only access to all modules' },
];

/* ─── Helpers ─────────────────────────────────────────────── */
function timeAgo(iso) {
    if (!iso) return 'Never';
    const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
    const h = Math.floor((Date.now() - new Date(iso)) / 3600000);
    const m = Math.floor((Date.now() - new Date(iso)) / 60000);
    if (d > 0) return `${d}d ago`;
    if (h > 0) return `${h}h ago`;
    if (m > 0) return `${m}m ago`;
    return 'Just now';
}
function initials(name) {
    return (name || '').split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) || '??';
}
const PALETTES = [
    ['#60A5FA', '#A78BFA'], ['#34D399', '#22D3EE'],
    ['#FBBF24', '#F87171'], ['#A78BFA', '#F472B6'], ['#22D3EE', '#34D399'],
];
function avatarGrad(id) {
    const [a, b] = PALETTES[id % PALETTES.length];
    return `linear-gradient(135deg, ${a}, ${b})`;
}

/* ─── Role Badge ──────────────────────────────────── */
function RoleBadge({ roleValue, onRemove }) {
    if (!roleValue) return null;
    const config = getRoleConfig(roleValue);
    const Icon = config.icon;
    return (
        <span
            className={`acc-role-badge ${onRemove ? 'removable' : ''}`}
            style={{ color: config.color, background: config.bg, borderColor: config.border }}
        >
            <Icon size={11} />
            {config.label}
            {onRemove && (
                <button
                    type="button"
                    className="acc-badge-remove"
                    onClick={e => { e.stopPropagation(); onRemove(roleValue); }}
                    aria-label={`Remove ${config.label}`}
                    style={{ '--badge-color': config.color }}
                >
                    <X size={9} />
                </button>
            )}
        </span>
    );
}

/* ─── Assign Roles Modal ──────────────────────────────────── */
function AssignRolesModal({ user, onClose, onSave }) {
    const [selected, setSelected] = useState(new Set(user.roles || []));
    const [saving, setSaving] = useState(false);

    const toggle = (val) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(val)) next.delete(val);
            else next.add(val);
            return next;
        });
    };

    const handleSave = async () => {
        if (selected.size === 0) return;
        setSaving(true);
        await new Promise(r => setTimeout(r, 650));
        onSave([...selected]);
        setSaving(false);
        onClose();
    };

    const noChange =
        selected.size === (user.roles || []).length &&
        [...selected].every(v => (user.roles || []).includes(v));

    return (
        <ThemePortal>
            <div className="acc-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
                <div className="acc-roles-modal">
                    {/* Modal header */}
                    <div className="acc-roles-modal-hd">
                        <div className="acc-roles-modal-hd-left">
                            <div className="acc-roles-avatar" style={{ background: avatarGrad(user.id) }}>
                                {initials(user.name)}
                            </div>
                            <div>
                                <h3>Manage Roles</h3>
                                <p>{user.name} · {user.email}</p>
                            </div>
                        </div>
                        <button className="acc-modal-x" onClick={onClose}><X size={16} /></button>
                    </div>

                    {/* Instructions strip */}
                    <div className="acc-roles-hint">
                        <Shield size={13} />
                        <span>Select one or more roles to assign. Click a role to toggle it.</span>
                    </div>

                    {/* Role cards grid */}
                    <div className="acc-roles-modal-body">
                        {/* Scrollable card area — capped height, scrolls internally */}
                        <div className="acc-roles-cards-scroll">
                            <div className="acc-multi-role-grid">
                                {AVAILABLE_ROLES.map(role => {
                                    const config = getRoleConfig(role.role_name);
                                    const RIcon = config.icon;
                                    const sel = selected.has(role.role_name);
                                    return (
                                        <button
                                            key={role.role_id}
                                            type="button"
                                            className={`acc-mrcard ${sel ? 'sel' : ''}`}
                                            style={sel ? { borderColor: config.border, background: config.bg } : {}}
                                            onClick={() => toggle(role.role_name)}
                                        >
                                            {/* Check indicator */}
                                            <div className={`acc-mrcard-check ${sel ? 'checked' : ''}`}
                                                style={sel ? { background: config.color, borderColor: config.color } : {}}>
                                                {sel && <CheckCircle2 size={11} color="white" />}
                                            </div>

                                            {/* Icon */}
                                            <div className="acc-mrcard-icon-wrap"
                                                style={sel ? { background: config.bg, borderColor: config.border } : {}}>
                                                <RIcon size={22} style={{ color: sel ? config.color : 'var(--text-muted)' }} />
                                            </div>

                                            {/* Text */}
                                            <span className="acc-mrcard-label"
                                                style={sel ? { color: config.color } : {}}>
                                                {config.label}
                                            </span>
                                            <span className="acc-mrcard-desc">{role.description}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Selected summary — NOT inside the scroll wrapper, expands freely */}
                        <div className="acc-roles-summary">
                            {/* Left — label + count */}
                            <div className="acc-roles-summary-left">
                                <span className="acc-roles-summary-label">Roles</span>
                                {selected.size > 0 && (
                                    <span className="acc-roles-summary-count">{selected.size}</span>
                                )}
                            </div>

                            {/* Thin divider */}
                            <div className="acc-roles-summary-divider" />

                            {/* Right — 4-per-row badge grid */}
                            {selected.size === 0
                                ? <span className="acc-roles-summary-empty">None selected — pick at least one</span>
                                : <div className="acc-roles-summary-grid">
                                    {[...selected].map(v => (
                                        <RoleBadge
                                            key={v}
                                            roleValue={v}
                                            onRemove={() => toggle(v)}
                                        />
                                    ))}
                                </div>
                            }
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="acc-modal-ft">
                        <button type="button" className="acc-btn-ghost" onClick={onClose}>Cancel</button>
                        <button
                            type="button"
                            className="acc-btn-primary"
                            onClick={handleSave}
                            disabled={saving || selected.size === 0 || noChange}
                        >
                            {saving ? <Loader2 size={15} className="acc-spin" /> : <CheckCircle2 size={15} />}
                            {saving ? 'Saving…' : 'Apply Roles'}
                        </button>
                    </div>
                </div>
            </div>
        </ThemePortal>
    );
}

/* ─── Remove Popover ──────────────────────────────────────── */
function RemoveButton({ user, onConfirm, loading }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    return (
        <div className="acc-remove-wrap" ref={ref}>
            <button className="acc-remove-btn" onClick={() => setOpen(v => !v)} disabled={loading}>
                <Trash2 size={14} />
            </button>
            {open && (
                <div className="acc-remove-popover">
                    <div className="acc-pop-danger-icon"><Trash2 size={15} /></div>
                    <p>Remove <strong>{user.name}</strong>?</p>
                    <span>This action cannot be undone.</span>
                    <div className="acc-pop-btns">
                        <button className="acc-pop-cancel" onClick={() => setOpen(false)}>Cancel</button>
                        <button className="acc-pop-confirm" onClick={() => { onConfirm(); setOpen(false); }}>
                            {loading ? <Loader2 size={11} className="acc-spin" /> : null}
                            Remove
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Add Member Modal ────────────────────────────────────── */
function AddUserModal({ onClose, onAdded }) {
    const [form, setForm] = useState({ firstName: '', lastName: '', email: '', roles: new Set(['read_only']) });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const [apiErr, setApiErr] = useState('');

    const validate = () => {
        const e = {};
        if (!form.firstName.trim()) e.firstName = 'Required';
        if (!form.lastName.trim()) e.lastName = 'Required';
        if (!form.email.trim()) e.email = 'Required';
        else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
        return e;
    };

    const toggleRole = (val) => {
        setForm(p => {
            const next = new Set(p.roles);
            if (next.has(val)) next.delete(val);
            else next.add(val);
            return { ...p, roles: next };
        });
    };

    const handleSubmit = async (ev) => {
        ev.preventDefault();
        const e = validate();
        if (Object.keys(e).length) { setErrors(e); return; }
        setBusy(true); setApiErr('');
        try {
            await new Promise(r => setTimeout(r, 800));
            onAdded({
                id: Date.now(),
                name: `${form.firstName} ${form.lastName}`,
                email: form.email,
                roles: [...form.roles],
                lastSignedIn: null,
            });
            onClose();
        } catch (err) {
            setApiErr(err?.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: undefined })); };

    return (
        <ThemePortal>
            <div className="acc-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
                <div className="acc-modal">
                    <div className="acc-modal-hd">
                        <div className="acc-modal-hd-icon"><UserPlus size={20} /></div>
                        <div>
                            <h3>Add New Member</h3>
                            <p>Invite someone to your workspace</p>
                        </div>
                        <button className="acc-modal-x" onClick={onClose}><X size={16} /></button>
                    </div>

                    <form onSubmit={handleSubmit} noValidate>
                        <div className="acc-modal-body">
                            <div className="acc-field-row">
                                <div className={`acc-field ${errors.firstName ? 'err' : ''}`}>
                                    <label htmlFor="af-fn">First Name</label>
                                    <input id="af-fn" type="text" placeholder="e.g. Darsh" value={form.firstName} onChange={e => set('firstName', e.target.value)} />
                                    {errors.firstName && <span className="acc-ferr"><AlertCircle size={11} />{errors.firstName}</span>}
                                </div>
                                <div className={`acc-field ${errors.lastName ? 'err' : ''}`}>
                                    <label htmlFor="af-ln">Last Name</label>
                                    <input id="af-ln" type="text" placeholder="e.g. Shah" value={form.lastName} onChange={e => set('lastName', e.target.value)} />
                                    {errors.lastName && <span className="acc-ferr"><AlertCircle size={11} />{errors.lastName}</span>}
                                </div>
                            </div>

                            <div className={`acc-field ${errors.email ? 'err' : ''}`}>
                                <label htmlFor="af-em">Email Address</label>
                                <div className="acc-input-icon">
                                    <Mail size={14} className="acc-inp-ico" />
                                    <input id="af-em" type="email" placeholder="user@company.com" value={form.email} onChange={e => set('email', e.target.value)} />
                                </div>
                                {errors.email && <span className="acc-ferr"><AlertCircle size={11} />{errors.email}</span>}
                            </div>

                            <div className="acc-field">
                                <label>Assign Roles <span className="acc-field-sub">(select one or more)</span></label>
                                <div className="acc-role-grid">
                                    {AVAILABLE_ROLES.map(role => {
                                        const config = getRoleConfig(role.role_name);
                                        const RIcon = config.icon;
                                        const sel = form.roles.has(role.role_name);
                                        return (
                                            <button
                                                type="button"
                                                key={role.role_id}
                                                className={`acc-rcard ${sel ? 'sel' : ''}`}
                                                style={sel ? { borderColor: config.border, background: config.bg } : {}}
                                                onClick={() => toggleRole(role.role_name)}
                                            >
                                                <span className="acc-rcard-ico" style={{ color: sel ? config.color : undefined }}><RIcon size={18} /></span>
                                                <span className="acc-rcard-lbl" style={{ color: sel ? config.color : undefined }}>{config.label}</span>
                                                <span className="acc-rcard-desc">{role.description}</span>
                                                {sel && <CheckCircle2 size={11} className="acc-rcard-chk" style={{ color: config.color }} />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {apiErr && (
                                <div className="acc-api-err">
                                    <AlertCircle size={13} /><span>{apiErr}</span>
                                </div>
                            )}
                        </div>

                        <div className="acc-modal-ft">
                            <button type="button" className="acc-btn-ghost" onClick={onClose}>Cancel</button>
                            <button type="submit" className="acc-btn-primary" disabled={busy}>
                                {busy ? <Loader2 size={15} className="acc-spin" /> : <UserPlus size={15} />}
                                {busy ? 'Adding…' : 'Add Member'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </ThemePortal>
    );
}

/* ─── Main Component ──────────────────────────────────────── */
export default function AccountTab() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [removing, setRemoving] = useState({});
    const [toast, setToast] = useState(null);
    const [editingUser, setEditingUser] = useState(null); // user whose roles modal is open

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                await new Promise(r => setTimeout(r, 600));
                setUsers(MOCK_USERS);
            } catch { setUsers(MOCK_USERS); }
            finally { setLoading(false); }
        })();
    }, []);

    const showToast = (type, msg) => {
        setToast({ type, msg, key: Date.now() });
        setTimeout(() => setToast(null), 3000);
    };

    const onSaveRoles = (userId, roles) => {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, roles } : u));
        showToast('success', 'Roles updated successfully');
    };

    const onRemove = async (id) => {
        setRemoving(p => ({ ...p, [id]: true }));
        try {
            await new Promise(r => setTimeout(r, 500));
            setUsers(prev => prev.filter(u => u.id !== id));
            showToast('success', 'Member removed');
        } catch { showToast('error', 'Failed to remove member'); }
        finally { setRemoving(p => ({ ...p, [id]: false })); }
    };

    const onAdded = (u) => {
        setUsers(prev => [...prev, u]);
        showToast('success', `${u.name} added successfully`);
    };

    const filtered = users.filter(u =>
        `${u.name} ${u.email} ${(u.roles || []).join(' ')}`.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="acc-root">
            {/* Header */}
            <div className="acc-hdr">
                <div className="acc-hdr-left">
                    <div className="acc-hdr-icon"><Users size={22} /></div>
                    <div>
                        <h2>Team Members</h2>
                        <p>Manage access and roles for your workspace</p>
                    </div>
                </div>
                <div className="acc-hdr-right">
                    <div className="acc-count-pill">
                        <span className="acc-count-n">{users.length}</span>
                        <span className="acc-count-l">Members</span>
                    </div>
                    <button className="acc-add-btn" onClick={() => setShowAdd(true)}>
                        <UserPlus size={15} /><span>Add Member</span>
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="acc-search">
                <Search size={15} className="acc-search-ico" />
                <input
                    type="text"
                    placeholder="Search by name, email or role…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                {search && <button className="acc-search-clr" onClick={() => setSearch('')}><X size={13} /></button>}
            </div>

            {/* Table */}
            <div className="acc-panel">
                <div className="acc-thead">
                    <div className="acc-th col-member">Member</div>
                    <div className="acc-th col-email">Email</div>
                    <div className="acc-th col-signin">Last Signed In</div>
                    <div className="acc-th col-roles">Assigned Roles</div>
                    <div className="acc-th col-actions">Actions</div>
                </div>

                <div className="acc-tbody">
                    {loading ? (
                        <div className="acc-state"><Loader2 size={26} className="acc-spin" /><span>Loading members…</span></div>
                    ) : filtered.length === 0 ? (
                        <div className="acc-state"><UserCircle2 size={38} /><span>{search ? 'No members match your search.' : 'No members yet.'}</span></div>
                    ) : filtered.map((user, idx) => (
                        <div
                            key={user.id}
                            className="acc-tr"
                            style={{ animationDelay: `${idx * 40}ms` }}
                        >
                            {/* Member */}
                            <div className="acc-td col-member">
                                <div className="acc-avatar" style={{ background: avatarGrad(user.id) }}>{initials(user.name)}</div>
                                <span className="acc-uname">{user.name}</span>
                            </div>

                            {/* Email */}
                            <div className="acc-td col-email acc-email">
                                <Mail size={12} /><span>{user.email}</span>
                            </div>

                            {/* Last signed in */}
                            <div className="acc-td col-signin acc-time">
                                <Clock size={12} /><span>{timeAgo(user.lastSignedIn)}</span>
                            </div>

                            {/* Assigned Roles — badge pills */}
                            <div className="acc-td col-roles">
                                <div className="acc-roles-cell">
                                    {(user.roles || []).length === 0
                                        ? <span className="acc-no-roles">No roles</span>
                                        : (user.roles || []).map(rv => <RoleBadge key={rv} roleValue={rv} />)
                                    }
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="acc-td col-actions">
                                <button
                                    className="acc-edit-btn"
                                    onClick={() => setEditingUser(user)}
                                    title="Edit roles"
                                >
                                    <Pencil size={14} />
                                </button>
                                <RemoveButton user={user} onConfirm={() => onRemove(user.id)} loading={!!removing[user.id]} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Role Legend */}
            <div className="acc-legend">
                {Object.entries(ROLE_CATEGORIES).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                        <span key={key} className="acc-legend-item" style={{ color: config.color }}>
                            <Icon size={12} />
                            <strong>{formatRoleName(key)}</strong>
                            <em>— {config.desc}</em>
                        </span>
                    );
                })}
            </div>

            {showAdd && <AddUserModal onClose={() => setShowAdd(false)} onAdded={onAdded} />}

            {editingUser && (
                <AssignRolesModal
                    user={editingUser}
                    onClose={() => setEditingUser(null)}
                    onSave={(roles) => onSaveRoles(editingUser.id, roles)}
                />
            )}

            {toast && (
                <div key={toast.key} className={`acc-toast ${toast.type}`}>
                    {toast.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                    <span>{toast.msg}</span>
                </div>
            )}
        </div>
    );
}