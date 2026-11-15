const React = require('react'); const { renderToStaticMarkup } = require('react-dom/server');
const L = require('lucide-react');
const names = ['Monitor','Smartphone','Wrench','LayoutGrid','QrCode','MessageCircle','Users','Wallet','Package','Sparkles','Tv','DatabaseBackup','ClipboardCheck','GraduationCap','Headphones','BadgeCheck','ScanLine','Bell','Camera','Clock','TrendingUp','AlertTriangle','PhoneCall','Archive','FileSpreadsheet','CheckCircle2','ArrowRight','Star','Store','CalendarCheck','Receipt','ShieldCheck','Check','Zap','Printer','Calendar','ChevronRight','Search','Send','Plus','Phone','X','ArrowUpRight','Timer','Layers','Image','Bot','CircleDollarSign','Flame','Eye','LayoutDashboard','ListChecks','KanbanSquare','Settings','Home','Inbox','BarChart3','Wifi','BatteryFull','Signal','MoreHorizontal','Filter','Tag','Hash','RefreshCw','Rocket','Repeat','Box','UserCheck','Gauge','CircleCheck','Square','SquareCheck','Briefcase','Target','Infinity'];
const out = {};
for (const n of names) { if (!L[n]) { console.error('missing', n); continue; } out[n] = renderToStaticMarkup(React.createElement(L[n], { size: 40, strokeWidth: 2, color: 'currentColor' })); }
require('fs').writeFileSync(process.argv[2], JSON.stringify(out));
console.log(Object.keys(out).length);
