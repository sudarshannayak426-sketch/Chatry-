export interface BotAvatarPreset {
  id: string;
  name: string;
  url: string;
  badge?: string;
}

export const BOT_AVATAR_PRESETS: BotAvatarPreset[] = [
  {
    id: 'cyber-spark',
    name: 'Cyber Spark',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=CyberSpark&backgroundColor=b6e3f4,c0aede,d1d4f9',
    badge: 'Popular',
  },
  {
    id: 'neon-robo',
    name: 'Neon Robo',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=NeonRobot&backgroundColor=ffd5dc,ffdfbf',
    badge: 'Cool',
  },
  {
    id: 'astro-titan',
    name: 'Astro Titan',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=AstroTitan&backgroundColor=c0aede,b6e3f4',
    badge: 'Cosmic',
  },
  {
    id: 'mech-warrior',
    name: 'Mech Warrior',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=MechWarrior&backgroundColor=d1d4f9,ffd5dc',
  },
  {
    id: 'quantum-dex',
    name: 'Quantum Dex',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=QuantumDex&backgroundColor=b6e3f4,ffd5dc',
  },
  {
    id: 'hyper-nova',
    name: 'Hyper Nova',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=HyperNova&backgroundColor=ffdfbf,ffd5dc',
    badge: 'Hot',
  },
  {
    id: 'shadow-bot',
    name: 'Shadow Bot',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=ShadowBot&backgroundColor=c0aede,d1d4f9',
  },
  {
    id: 'glitch-bot',
    name: 'Glitch Bot',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=GlitchBot&backgroundColor=d1d4f9,c0aede',
  },
  {
    id: 'omega-zero',
    name: 'Omega Zero',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=OmegaZero&backgroundColor=b6e3f4,d1d4f9',
  },
  {
    id: 'circuit-hero',
    name: 'Circuit Hero',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=CircuitHero&backgroundColor=ffd5dc,ffdfbf',
  },
  {
    id: 'zenith-bot',
    name: 'Zenith Bot',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=ZenithBot&backgroundColor=c0aede,d1d4f9',
  },
  {
    id: 'pulse-bot',
    name: 'Pulse Bot',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=PulseBot&backgroundColor=b6e3f4,ffd5dc',
  },
];

export function getRandomBotAvatar(): string {
  const seeds = [
    'BoltPrime',
    'AlphaCore',
    'VortexRobo',
    'PixelDroid',
    'EchoMech',
    'NovaSpark',
    'AuraBot',
    'VectorUnit',
    'ChronoBot',
  ];
  const randomSeed = seeds[Math.floor(Math.random() * seeds.length)] + '_' + Math.floor(Math.random() * 1000);
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${randomSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
}

export interface BotBannerPreset {
  id: string;
  name: string;
  type: 'bot' | 'whatsapp' | 'neon';
  url: string;
  description: string;
}

export const DEFAULT_BOT_BANNER = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400" viewBox="0 0 1200 400" fill="none">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="400" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#030712"/>
        <stop offset="50%" stop-color="#0c1222"/>
        <stop offset="100%" stop-color="#020617"/>
      </linearGradient>
      <pattern id="botgrid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(99,102,241,0.14)" stroke-width="1"/>
        <circle cx="20" cy="20" r="1.5" fill="rgba(56,189,248,0.25)"/>
      </pattern>
      <linearGradient id="neonLine" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#6366f1" stop-opacity="0.8"/>
        <stop offset="50%" stop-color="#38bdf8" stop-opacity="0.9"/>
        <stop offset="100%" stop-color="#a855f7" stop-opacity="0.8"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="400" fill="url(#bg)"/>
    <rect width="1200" height="400" fill="url(#botgrid)"/>
    <!-- Cyber circuit lines -->
    <path d="M0 100 Q 300 140 600 80 T 1200 120" stroke="url(#neonLine)" stroke-width="2" fill="none"/>
    <path d="M0 320 Q 400 240 800 310 T 1200 260" stroke="rgba(56,189,248,0.3)" stroke-width="2" fill="none"/>
    <circle cx="300" cy="140" r="5" fill="#38bdf8"/>
    <circle cx="600" cy="80" r="6" fill="#a855f7"/>
    <circle cx="900" cy="100" r="4" fill="#6366f1"/>
    <!-- Central Robot Core Motif -->
    <g transform="translate(600, 160)" opacity="0.35">
      <rect x="-80" y="-40" width="160" height="80" rx="16" fill="none" stroke="#38bdf8" stroke-width="2"/>
      <circle cx="-35" cy="0" r="14" fill="#38bdf8"/>
      <circle cx="35" cy="0" r="14" fill="#38bdf8"/>
      <line x1="-20" y1="20" x2="20" y2="20" stroke="#a855f7" stroke-width="3" stroke-linecap="round"/>
      <line x1="0" y1="-40" x2="0" y2="-60" stroke="#38bdf8" stroke-width="3"/>
      <circle cx="0" cy="-65" r="5" fill="#38bdf8"/>
    </g>
    <!-- Digital Bot Status Text -->
    <text x="60" y="370" fill="rgba(148,163,184,0.5)" font-family="monospace" font-size="14" font-weight="bold" letter-spacing="3">AI BOT SYSTEM // CHATRY CORE</text>
    <text x="1050" y="370" fill="rgba(56,189,248,0.6)" font-family="monospace" font-size="14" font-weight="bold">ONLINE v2.0</text>
  </svg>`
)}`;

export const WHATSAPP_CLEAN_BANNER = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400" viewBox="0 0 1200 400" fill="none">
    <defs>
      <linearGradient id="wa_bg" x1="0" y1="0" x2="0" y2="400" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#0b141a"/>
        <stop offset="50%" stop-color="#111b21"/>
        <stop offset="100%" stop-color="#0b141a"/>
      </linearGradient>
      <pattern id="wa_doodle" width="80" height="80" patternUnits="userSpaceOnUse">
        <circle cx="20" cy="20" r="2" fill="rgba(255,255,255,0.04)"/>
        <circle cx="60" cy="60" r="2" fill="rgba(255,255,255,0.04)"/>
        <rect x="50" y="15" width="10" height="8" rx="2" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
        <path d="M15 50 Q 20 45 25 50" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="1200" height="400" fill="url(#wa_bg)"/>
    <rect width="1200" height="400" fill="url(#wa_doodle)"/>
    <text x="50%" y="50%" text-anchor="middle" fill="rgba(255,255,255,0.08)" font-family="sans-serif" font-size="15" font-weight="600" letter-spacing="2">NO BANNER (WHATSAPP CLEAN MODE)</text>
  </svg>`
)}`;

export const NEON_MATRIX_BANNER = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400" viewBox="0 0 1200 400" fill="none">
    <defs>
      <linearGradient id="nbg" x1="0" y1="0" x2="1200" y2="400" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#090514"/>
        <stop offset="50%" stop-color="#160829"/>
        <stop offset="100%" stop-color="#05030a"/>
      </linearGradient>
      <linearGradient id="nline" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#10b981"/>
        <stop offset="50%" stop-color="#8b5cf6"/>
        <stop offset="100%" stop-color="#ec4899"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="400" fill="url(#nbg)"/>
    <path d="M0 80 L 400 120 L 800 60 L 1200 110" stroke="url(#nline)" stroke-width="2.5" fill="none"/>
    <path d="M0 300 L 350 260 L 750 330 L 1200 280" stroke="rgba(139,92,246,0.4)" stroke-width="2" fill="none"/>
    <circle cx="400" cy="120" r="7" fill="#10b981"/>
    <circle cx="800" cy="60" r="7" fill="#ec4899"/>
    <text x="60" y="360" fill="rgba(167,139,250,0.4)" font-family="monospace" font-size="13" font-weight="bold">NEON BOT MATRIX v3</text>
  </svg>`
)}`;

export const BOT_BANNER_PRESETS: BotBannerPreset[] = [
  {
    id: 'bot_cyber',
    name: '🤖 Cyber Bot Matrix',
    type: 'bot',
    url: DEFAULT_BOT_BANNER,
    description: 'High-tech robotic circuits and cyber grid',
  },
  {
    id: 'whatsapp_clean',
    name: '💬 WhatsApp Clean (No Banner)',
    type: 'whatsapp',
    url: WHATSAPP_CLEAN_BANNER,
    description: 'Minimalist WhatsApp-style dark header (no photo banner)',
  },
  {
    id: 'neon_matrix',
    name: '⚡ Neon Mecha Core',
    type: 'neon',
    url: NEON_MATRIX_BANNER,
    description: 'Vibrant emerald and purple neon bot grid',
  },
];

