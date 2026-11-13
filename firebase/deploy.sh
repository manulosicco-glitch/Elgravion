#!/usr/bin/env bash
# Pubblica il server di Elgravion (regole del database + arbitro della Classificata) e accende la Classificata.
# Si lancia da Google Cloud Shell (https://shell.cloud.google.com), già collegata al tuo account Google:
#   git clone https://github.com/manulosicco-glitch/Elgravion.git && bash Elgravion/firebase/deploy.sh
set -euo pipefail
cd "$(dirname "$0")"
PROJECT=elgravion
FB="npx -y firebase-tools@latest"
echo "== 1/4 Accesso a Firebase"
if ! $FB projects:list >/dev/null 2>&1; then $FB login --no-localhost; fi
echo "== 2/4 Preparo l'arbitro (usa lo stesso motore del gioco)"
mkdir -p functions/game && cp ../engine.js ../data.js functions/game/
(cd functions && npm ci --no-audit --no-fund)
echo "== 3/4 Pubblico regole e arbitro (la prima volta può volerci qualche minuto)"
$FB deploy --project "$PROJECT" --only database,functions --force --non-interactive
echo "== 4/4 Accendo la Classificata protetta"
$FB database:set /config/rankedServer --data true --project "$PROJECT" --instance elgravion-default-rtdb --force
echo
echo "Fatto: la Classificata ora è giudicata dal server."
