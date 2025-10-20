import React, { useEffect, useState, useMemo } from "react"; import DOMPurify from "dompurify";

// Placeholder API constant (replace with your real endpoint) const GET_PRODUCTS_API = "https://fakestoreapi.com/products"; // you already provided GET_PRODUCTS_API

// AES placeholder: NOT real encryption. Replace with Web Crypto API or CryptoJS in production. const AES_PLACEHOLDER_KEY = "AES_PLACEHOLDER_KEY"; function encryptPlaceholder(plain) { try { return btoa(unescape(encodeURIComponent(plain))); } catch (e) { console.warn("encryptPlaceholder failed", e); return plain; } } function decryptPlaceholder(cipher) { try { return decodeURIComponent(escape(atob(cipher))); } catch (e) { console.warn("decryptPlaceholder failed", e); return cipher; } }

function saveEncryptedLocal(key, obj) { try { const str = JSON.stringify(obj); const enc = encryptPlaceholder(str); localStorage.setItem(key, enc); } catch (e) { console.error("saveEncryptedLocal failed", e); } } function loadEncryptedLocal(key, defaultVal) { try { const enc = localStorage.getItem(key); if (!enc) return defaultVal; const str = decryptPlaceholder(enc); return JSON.parse(str); } catch (e) { console.error("loadEncryptedLocal failed", e); return defaultVal; } }

export default function Home() { const [products, setProducts] = useState([]); const [loading, setLoading] = useState(true); const [search, setSearch] = useState(() => loadEncryptedLocal("home_search", "")); const [category, setCategory] = useState(() => loadEncryptedLocal("home_category", "all")); const [cart, setCart] = useState(() => loadEncryptedLocal("cart_encrypted", []));

useEffect(() => { // fetch products let mounted = true; setLoading(true); fetch(GET_PRODUCTS_API) .then((r) => r.json()) .then((data) => { if (!mounted) return; setProducts(Array.isArray(data) ? data : []); }) .catch((e) => { console.error("Failed to fetch products", e); setProducts([]); }) .finally(() => mounted && setLoading(false));

return () => {
  mounted = false;
};

}, []);

// derive categories const categories = useMemo(() => { const set = new Set(); products.forEach((p) => p.category && set.add(p.category)); return ["all", ...Array.from(set)]; }, [products]);

// sanitize search input using DOMPurify before saving/using function handleSearchChange(e) { const raw = e.target.value; const clean = DOMPurify.sanitize(raw, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }); setSearch(clean); saveEncryptedLocal("home_search", clean); }

function handleCategoryChange(e) { const raw = e.target.value; const clean = DOMPurify.sanitize(raw, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }); setCategory(clean); saveEncryptedLocal("home_category", clean); }

function addToCart(product) { const short = { id: product.id, title: product.title, price: product.price, image: product.image, qty: 1, }; const existingIndex = cart.findIndex((c) => c.id === product.id); let updated; if (existingIndex >= 0) { updated = cart.map((c) => (c.id === product.id ? { ...c, qty: c.qty + 1 } : c)); } else { updated = [...cart, short]; } setCart(updated); saveEncryptedLocal("cart_encrypted", updated); // record an action log (also encrypted) const actions = loadEncryptedLocal("user_actions", []); const newAction = { type: "add_to_cart", productId: product.id, timestamp: new Date().toISOString(), }; const updatedActions = [newAction, ...actions].slice(0, 50); // keep recent 50 saveEncryptedLocal("user_actions", updatedActions); }

function filteredProducts() { const q = (search || "").trim().toLowerCase(); return products.filter((p) => { if (category && category !== "all" && p.category !== category) return false; if (!q) return true; const title = (p.title || "").toString().toLowerCase(); const desc = (p.description || "").toString().toLowerCase(); return title.includes(q) || desc.includes(q); }); }

const visible = filteredProducts();

return ( <div className="p-4 max-w-7xl mx-auto"> <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"> <div className="flex-1"> <label className="sr-only">Search products</label> <input
type="search"
value={search}
onChange={handleSearchChange}
placeholder="Search products..."
className="w-full md:w-80 p-2 rounded border"
aria-label="Search products"
/> </div>

<div className="w-full md:w-56">
      <label className="sr-only">Filter by category</label>
      <select value={category} onChange={handleCategoryChange} className="w-full p-2 rounded border">
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  </div>

  {/* skeleton loader while fetching */}
  {loading ? (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="border rounded p-4 animate-pulse">
          <div className="h-40 bg-gray-200 mb-4 rounded" />
          <div className="h-4 bg-gray-200 mb-2 rounded w-3/4" />
          <div className="h-4 bg-gray-200 mb-4 rounded w-1/2" />
          <div className="h-9 bg-gray-200 rounded w-24" />
        </div>
      ))}
    </div>
  ) : (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {visible.length === 0 ? (
        <div className="col-span-full text-center py-8">No products found.</div>
      ) : (
        visible.map((p) => (
          <article key={p.id} className="border rounded overflow-hidden flex flex-col">
            <div className="h-56 flex items-center justify-center bg-white">
              {/* sanitize image src by attempting to build URL; fallback to empty */}
              <img
                src={sanitizeImageSrc(p.image)}
                alt={safeText(p.title)}
                className="max-h-52 object-contain"
                loading="lazy"
              />
            </div>

            <div className="p-4 flex-1 flex flex-col">
              <h3 className="text-sm md:text-base font-medium mb-2 line-clamp-2">{safeText(p.title)}</h3>
              <div className="text-lg font-semibold mb-4">${Number(p.price).toFixed(2)}</div>
              <div className="mt-auto">
                <button
                  onClick={() => addToCart(p)}
                  className="w-full py-2 rounded bg-indigo-600 text-white hover:opacity-95"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </article>
        ))
      )}
    </div>
  )}
</div>

); }

// --- Utility helpers (kept at bottom for readability) --- function safeText(str) { // DOMPurify will remove any tags; we still render as text content try { const clean = DOMPurify.sanitize(String(str || ""), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }); return clean; } catch (e) { return String(str || ""); } }

function sanitizeImageSrc(src) { try { if (!src) return ""; // try to construct a URL to avoid javascript: URIs const url = new URL(src, window.location.href); if (url.protocol === "http:" || url.protocol === "https:") return url.toString(); return ""; } catch (e) { return ""; } }
