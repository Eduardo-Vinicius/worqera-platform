/** Runs before the first paint so the dark theme and a closed announce bar never flash. */
const SCRIPT = `try{var d=document.documentElement;if(localStorage.getItem("wq-lp-theme")==="dark")d.dataset.lpTheme="dark";if(localStorage.getItem("wq-lp-announce")==="closed")d.dataset.lpAnnounce="closed"}catch(e){}`

export function LpThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />
}
