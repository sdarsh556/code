import { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Server,
    Boxes,
    Database,
    Menu,
    X,
    Sun,
    Moon,
    LogOut,
    User,
    ChevronRight,
    Settings as SettingsIcon,
    BarChart3,
    Layers
} from 'lucide-react';
import '../css/Layout.css';
import '../css/body-theme.css';
import DynamicBackground from './background/DynamicBackground';
import ECSIcon from './common/ECSIcon';
import { logout } from './utils/auth';
import publicAxios from './api/publicAxios';

function Layout() {
    const [bgContext, setBgContext] = useState('default');
    const [user, setUser] = useState(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isDarkTheme, setIsDarkTheme] = useState(() => {
        return localStorage.getItem('theme') === 'dark';
    });

    const navigate = useNavigate();
    const location = useLocation();

    /* ===============================
       THEME HANDLING
    ============================== */
    useEffect(() => {
        document.body.setAttribute('data-theme', isDarkTheme ? 'dark' : 'light');
        localStorage.setItem('theme', isDarkTheme ? 'dark' : 'light');
    }, [isDarkTheme]);

    /* ===============================
       FETCH USER FROM BACKEND
    ============================== */
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await publicAxios.get('/auth/session');
                setUser(res.data.user);
            } catch (err) {
                window.location.replace(`${BACKEND_BASE}/api/auth/saml/login`);
            }
        };

        fetchUser();
    }, [navigate]);


    const handleLogout = async () => {
        await logout();
    };

    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
    };

    const toggleTheme = () => {
        setIsDarkTheme(!isDarkTheme);
    };

    const navItems = [
        { path: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
        { path: '/ec2', icon: Server, label: 'EC2 Instances' },
        { path: '/ecs', icon: ECSIcon, label: 'ECS Clusters', isCustomIcon: true },
        { path: '/eks', icon: Boxes, label: 'EKS Clusters' },
        { path: '/rds', icon: Database, label: 'RDS Databases' },
        { path: '/asg', icon: Layers, label: 'Auto Scaling Groups' },
        { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    ];

    const getCurrentPageTitle = () => {
        const currentItem = navItems.find(item =>
            item.end
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path)
        );
        return currentItem?.label || 'Dashboard';
    };

    return (
        <div className="layout-container" data-theme={isDarkTheme ? 'dark' : 'light'}>
            <DynamicBackground context={bgContext} />

            {/* HEADER */}
            <header className="modern-header">
                <div className="header-left">
                    <button
                        className="sidebar-toggle-btn"
                        onClick={toggleSidebar}
                        aria-label="Toggle sidebar"
                    >
                        {isSidebarCollapsed ? <Menu size={20} /> : <X size={20} />}
                    </button>

                    <Link to="/" className="brand-logo">
                        <div className="logo-icon">
                            <Server size={24} strokeWidth={2.5} />
                        </div>
                        <span className="brand-name">EDITH</span>
                    </Link>

                    <div className="breadcrumb">
                        <span className="breadcrumb-item">AWS</span>
                        <ChevronRight size={16} />
                        <span className="breadcrumb-item current">
                            {getCurrentPageTitle()}
                        </span>
                    </div>
                </div>

                <div className="header-right">
                    <button
                        className="icon-btn theme-btn"
                        onClick={toggleTheme}
                    >
                        {isDarkTheme ? <Sun size={20} /> : <Moon size={20} />}
                    </button>

                    <div className="user-profile">
                        <div className="user-avatar">
                            <User size={18} />
                        </div>
                        <div className="user-info">
                            <span className="user-name">
                                {user?.name || 'User'}
                            </span>
                            <span className="user-role">
                                ID: {user?.user_id || '--'}
                            </span>
                        </div>
                    </div>

                    <button
                        className="icon-btn logout-btn"
                        onClick={handleLogout}
                        aria-label="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            {/* BODY */}
            <div className="layout-body">
                <aside className={`modern-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
                    <nav className="sidebar-nav">
                        <div className="nav-section">
                            {!isSidebarCollapsed && <div className="nav-section-title">Resources</div>}
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        end={item.end}
                                        className={({ isActive }) =>
                                            `nav-link ${isActive ? 'active' : ''}`
                                        }
                                    >
                                        <div className="nav-link-content">
                                            <Icon size={20} />
                                            {!isSidebarCollapsed && (
                                                <span>{item.label}</span>
                                            )}
                                        </div>
                                    </NavLink>
                                );
                            })}
                        </div>
                    </nav>

                    {!isSidebarCollapsed && (
                        <div className="sidebar-footer">
                            <Link
                                to="/settings"
                                className={`sidebar-footer-card-link ${location.pathname === '/settings' ? 'active' : ''}`}
                            >
                                <div className="sidebar-footer-card">
                                    <SettingsIcon size={20} />
                                    <div>
                                        <h4>Settings</h4>
                                        <p>Manage preferences</p>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    )}
                </aside>

                <main className="main-content">
                    <div className="content-wrapper">
                        <Outlet context={{ bgContext, setBgContext }} />
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Layout;
