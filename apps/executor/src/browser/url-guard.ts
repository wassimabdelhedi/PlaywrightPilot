// apps/executor/src/browser/url-guard.ts
//
// TOUTE URL cible (création de projet, lien découvert pendant un crawl,
// redirection HTTP suivie en cours de navigation) doit passer par
// `assertSafeUrl` avant qu'une requête réseau ne parte. Sans ce garde,
// rien n'empêche un projet malveillant de cibler le réseau interne de
// production (services internes, métadonnées cloud, bases de données).
//
// Deux niveaux de vérification, dans cet ordre :
//   1. Le SCHÉMA et la forme de l'URL (rapide, pas de réseau)
//   2. La résolution DNS réelle du host (empêche le DNS rebinding —
//      un domaine public qui résout vers une IP privée)

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export class UnsafeUrlError extends Error {}

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

// Plages IPv4 privées/réservées — RFC 1918, loopback, link-local
// (inclut 169.254.169.254, l'endpoint de métadonnées cloud classique).
const PRIVATE_IPV4_RANGES: Array<[string, number]> = [
  ["10.0.0.0", 8],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["0.0.0.0", 8],
];

function ipToLong(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
  const ipLong = ipToLong(ip);
  return PRIVATE_IPV4_RANGES.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (ipLong & mask) === (ipToLong(base) & mask);
  });
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  // ::1 (loopback), fc00::/7 (unique local), fe80::/10 (link-local)
  return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8");
}

export async function assertSafeUrl(rawUrl: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError(`URL invalide : ${rawUrl}`);
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new UnsafeUrlError(`Schéma non autorisé : ${parsed.protocol}`);
  }

  // Les identifiants dans l'URL (http://user:pass@host) sont un vecteur
  // classique de confusion de parsing entre différentes librairies.
  if (parsed.username || parsed.password) {
    throw new UnsafeUrlError("Les identifiants dans l'URL ne sont pas autorisés");
  }

  const hostname = parsed.hostname;

  // Cas où l'utilisateur a directement fourni une IP littérale.
  if (isIP(hostname)) {
    if (isPrivateIPv4(hostname) || isPrivateIPv6(hostname)) {
      throw new UnsafeUrlError(`Adresse IP privée refusée : ${hostname}`);
    }
    return;
  }

  // Résolution DNS réelle — c'est l'étape qui bloque le DNS rebinding.
  // On vérifie TOUTES les adresses résolues, pas seulement la première.
  const records = await lookup(hostname, { all: true });

  for (const record of records) {
    const isPrivate = record.family === 4 ? isPrivateIPv4(record.address) : isPrivateIPv6(record.address);
    if (isPrivate) {
      throw new UnsafeUrlError(`${hostname} résout vers une adresse privée (${record.address})`);
    }
  }
}
