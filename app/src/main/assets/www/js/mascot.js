/* Maskot: Hüdhüd kuşu (SVG). Namaz çizimleri figures.js içindedir. */
window.K = window.K || {};
(function () {
  const HOOPOE = `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <ellipse cx="100" cy="192" rx="46" ry="7" fill="rgba(59,47,74,.12)"/>
  <g class="m-body">
    <g class="m-crest">
      <path d="M100 46 C 92 20, 70 8, 58 12 C 66 22, 80 34, 92 48 Z" fill="#F7A24B"/>
      <path d="M58 12 C 62 14, 64 18, 66 21 L 60 22 C 58 18, 57 15, 58 12 Z" fill="#3B2F4A"/>
      <path d="M102 44 C 96 16, 84 0, 74 0 C 80 12, 88 28, 96 46 Z" fill="#FFB65C"/>
      <path d="M74 0 C 77 3, 79 7, 80 10 L 75 11 C 74 7, 73 3, 74 0 Z" fill="#3B2F4A"/>
      <path d="M104 44 C 104 14, 98 -4, 92 -6 C 94 8, 96 26, 98 46 Z" fill="#F7A24B"/>
      <path d="M92 -6 C 94 -3, 95 1, 95 4 L 91 4 C 91 1, 91 -3, 92 -6 Z" fill="#3B2F4A"/>
      <path d="M106 46 C 112 18, 112 2, 108 -2 C 106 12, 104 30, 102 48 Z" fill="#FFB65C"/>
      <path d="M108 -2 C 110 1, 110 5, 110 8 L 106 7 C 106 4, 107 1, 108 -2 Z" fill="#3B2F4A"/>
    </g>
    <path class="m-tail" d="M58 150 C 34 156, 22 170, 20 182 C 34 178, 48 170, 64 160 Z" fill="#3B2F4A"/>
    <path d="M26 176 L 40 170 M 30 182 L 44 174" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="100" cy="128" rx="50" ry="48" fill="#F7A24B"/>
    <ellipse cx="108" cy="140" rx="32" ry="32" fill="#FFE0B8"/>
    <g class="m-wing">
      <path d="M58 112 C 52 140, 64 166, 92 170 C 96 150, 90 124, 74 108 Z" fill="#3B2F4A"/>
      <path d="M62 126 C 70 128, 80 134, 88 142 M 62 140 C 70 142, 80 148, 88 156 M 66 154 C 72 156, 80 160, 86 166" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none"/>
    </g>
    <circle cx="104" cy="78" r="36" fill="#F7A24B"/>
    <circle cx="96" cy="88" r="7" fill="#FF8FA8" opacity=".6"/>
    <g class="m-eye"><circle cx="112" cy="72" r="11" fill="#fff"/><circle cx="115" cy="73" r="6.5" fill="#3B2F4A"/><circle cx="117" cy="70" r="2.4" fill="#fff"/></g>
    <path d="M134 76 C 152 78, 170 86, 182 98 C 168 94, 150 90, 134 86 Z" fill="#5C4B51"/>
    <path class="m-beak-low" d="M134 86 C 148 90, 164 96, 176 102 C 162 102, 146 98, 132 92 Z" fill="#7A6670"/>
    <path d="M90 176 L 86 188 M 86 188 L 78 190 M 86 188 L 92 192 M 112 176 L 114 188 M 114 188 L 106 191 M 114 188 L 121 191" stroke="#E07B1A" stroke-width="4" stroke-linecap="round" fill="none"/>
  </g>
</svg>`;

  function mascotEl(cls = '') {
    const d = document.createElement('div');
    d.className = 'mascot ' + cls;
    d.innerHTML = HOOPOE;
    return d;
  }
  function react(el, kind, ms = 1600) {
    if (!el) return;
    el.classList.remove('happy', 'sad');
    void el.offsetWidth;
    el.classList.add(kind);
    clearTimeout(el._rt);
    el._rt = setTimeout(() => el.classList.remove(kind), ms);
  }

  K.Mascot = { el: mascotEl, react, HOOPOE };
})();
