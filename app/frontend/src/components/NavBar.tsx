import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', label: '输入' },
  { path: '/jd-analysis', label: '岗位分析' },
  { path: '/resume-preview', label: '简历预览' },
  { path: '/match-analysis', label: '匹配度分析' },
  { path: '/ai-config', label: 'API 配置' },
];

export default function NavBar() {
  const location = useLocation();

  return (
    <header className="border-b border-morandi-card-alt bg-morandi-card sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 min-h-12 flex items-center justify-between gap-3">
        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
          <span className="text-sm font-semibold tracking-tight text-morandi-text">
            Career Match Copilot
          </span>
          <nav className="flex items-center gap-1 overflow-x-auto py-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-morandi-primary/10 text-morandi-primary'
                      : 'text-morandi-text-muted hover:text-morandi-text-secondary'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="text-[11px] text-morandi-text-muted">
          你的 AI 求职助手
        </div>
      </div>
    </header>
  );
}
