import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// O Cloudflare Pages guarda só os assets do último deployment. Um separador aberto antes
// de um redeploy tem nomes de chunk antigos: o próximo carregamento falha (Firefox: MIME
// type não permitido; Chrome: ChunkLoadError) e a navegação parece "bloqueada". O Vite
// emite `vite:preloadError` nesse caso → recarregar uma vez para apanhar o build novo.
window.addEventListener("vite:preloadError", (e) => {
  e.preventDefault();
  try {
    const key = "chunk-reload-at";
    const last = Number(window.sessionStorage.getItem(key) || 0);
    if (Date.now() - last < 15_000) return; // evita ciclos de reload
    window.sessionStorage.setItem(key, String(Date.now()));
  } catch {
    /* storage indisponível: recarrega mesmo assim */
  }
  window.location.reload();
});
