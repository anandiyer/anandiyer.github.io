#!/bin/bash
# Download founder headshot images from Twitter/X profile photos
# Run this script from the root of the repo: ./download-founder-images.sh
#
# Twitter profile images on pbs.twimg.com are publicly accessible.
# For founders without Twitter, LinkedIn URLs are listed at the bottom
# for manual download.

mkdir -p images/founders

echo "Downloading founder headshots from Twitter..."
echo ""

# ── Rain ──────────────────────────────────────────────
echo "Rain:"
curl -sL -o images/founders/farooq-malik.png "https://pbs.twimg.com/profile_images/1534288855460978688/wcRjZRnk_400x400.png"
echo "  ✓ Farooq Malik (@rooqster)"
curl -sL -o images/founders/charles-naut.jpg "https://pbs.twimg.com/profile_images/1911953755366473728/-Ku3Eql-_400x400.jpg"
echo "  ✓ Charles Naut (@cnaut)"

# ── Gensyn ────────────────────────────────────────────
echo "Gensyn:"
curl -sL -o images/founders/ben-fielding.jpg "https://pbs.twimg.com/profile_images/1876081606156587008/WDXX0zIQ_400x400.jpg"
echo "  ✓ Ben Fielding (@BenFielding1)"
curl -sL -o images/founders/harry-grieve.jpg "https://pbs.twimg.com/profile_images/1997204408795295744/kFhBxf9n_400x400.jpg"
echo "  ✓ Harry Grieve (@_grieve)"

# ── Virtuals ──────────────────────────────────────────
echo "Virtuals:"
curl -sL -o images/founders/jansen-teng.jpg "https://pbs.twimg.com/profile_images/1654432243123904513/FmxcrTnC_400x400.jpg"
echo "  ✓ Jansen Teng (@ethermage)"
# Wee Kee Tiew - no Twitter photo found (see manual section below)

# ── Sahara ────────────────────────────────────────────
echo "Sahara:"
curl -sL -o images/founders/sean-ren.jpg "https://pbs.twimg.com/profile_images/1940649463653040128/Vp5qUvq8_400x400.jpg"
echo "  ✓ Sean Ren (@xiangrenNLP)"
curl -sL -o images/founders/tyler-zhou.jpg "https://pbs.twimg.com/profile_images/1958597441995120641/399Yndew_400x400.jpg"
echo "  ✓ Tyler Zhou (@tz_sahara)"

# ── Ritual ────────────────────────────────────────────
echo "Ritual:"
curl -sL -o images/founders/niraj-pant.jpg "https://pbs.twimg.com/profile_images/1262797879493578752/0MBMQfBa_400x400.jpg"
echo "  ✓ Niraj Pant (@niraj)"
curl -sL -o images/founders/akilesh-potti.jpg "https://pbs.twimg.com/profile_images/1923007636796067841/Yaaa5Xs2_400x400.jpg"
echo "  ✓ Akilesh Potti (@akilesh_potti)"

# ── Exo Labs ──────────────────────────────────────────
echo "Exo Labs:"
curl -sL -o images/founders/alex-cheema.jpg "https://pbs.twimg.com/profile_images/1671532231687282689/vlbc3Ytw_400x400.jpg"
echo "  ✓ Alex Cheema (@alexocheema)"
curl -sL -o images/founders/mohamed-baioumy.jpg "https://pbs.twimg.com/profile_images/1829418657392242690/E0Kogrca_400x400.jpg"
echo "  ✓ Mohamed Baioumy (@mo_baioumy)"

# ── OpenGradient ──────────────────────────────────────
echo "OpenGradient:"
curl -sL -o images/founders/matthew-wang.jpg "https://pbs.twimg.com/profile_images/1804218191389868032/14AF2tTx_400x400.jpg"
echo "  ✓ Matthew Wang (@0xDeltaHedged)"
# Adam Balogh - no Twitter photo found (see manual section below)

# ── Synthefy ──────────────────────────────────────────
echo "Synthefy:"
curl -sL -o images/founders/shawn-jain.jpg "https://pbs.twimg.com/profile_images/1539107389390983168/e9w1jQsn_400x400.jpg"
echo "  ✓ Shawn Jain (@shawnjain08)"
# Somi Agarwal - no Twitter photo found (see manual section below)

# ── Sentient ──────────────────────────────────────────
echo "Sentient:"
curl -sL -o images/founders/sandeep-nailwal.jpg "https://pbs.twimg.com/profile_images/1957857998904205312/SoPgZBdy_400x400.jpg"
echo "  ✓ Sandeep Nailwal (@sandeepnailwal)"
curl -sL -o images/founders/pramod-viswanath.jpg "https://pbs.twimg.com/profile_images/1751191693368369152/cn-N2tSA_400x400.jpg"
echo "  ✓ Pramod Viswanath (@viswanathpramod)"

# ── Mesta ─────────────────────────────────────────────
echo "Mesta:"
curl -sL -o images/founders/nitin-shrivastava.jpg "https://pbs.twimg.com/profile_images/1237642404724908033/cJZvjtzq_400x400.jpg"
echo "  ✓ Nitin Shrivastava (@tweetnitins)"
# Sandeep Pyapali - no Twitter photo found (see manual section below)
# Kiran Polavarapu - no Twitter photo found (see manual section below)

# ── Haptic ────────────────────────────────────────────
echo "Haptic:"
curl -sL -o images/founders/diego-prats.jpg "https://pbs.twimg.com/profile_images/2036941358917967873/bCOQ2DZT_400x400.jpg"
echo "  ✓ Diego Prats (@mexitlan)"
curl -sL -o images/founders/artia-moghbel.jpg "https://pbs.twimg.com/profile_images/649048320451579904/9tTr6vrU_400x400.jpg"
echo "  ✓ Artia Moghbel (@artia)"

# ── Robo ──────────────────────────────────────────────
echo "Robo:"
# Don Morton - no Twitter photo found (see manual section below)
# Kyle Noble - no Twitter photo found (see manual section below)
echo "  (no Twitter photos found — see manual section below)"

# ── Nirvana AI ────────────────────────────────────────
echo "Nirvana AI:"
curl -sL -o images/founders/naman-kapasi.jpg "https://pbs.twimg.com/profile_images/1901844450604621824/Kg99z5Tz_400x400.jpg"
echo "  ✓ Naman Kapasi (@naman_kapasi)"
# Nishank Gite - no Twitter photo found (see manual section below)

# ── Kocree ────────────────────────────────────────────
echo "Kocree:"
curl -sL -o images/founders/lav-varshney.jpeg "https://pbs.twimg.com/profile_images/3682182402/2db9737034301818b664f8180e015fd8_400x400.jpeg"
echo "  ✓ Lav Varshney (@lrvarshney)"

# ── Glide ─────────────────────────────────────────────
echo "Glide:"
curl -sL -o images/founders/gautam-ajjarapu.jpg "https://pbs.twimg.com/profile_images/1424531793131106304/NYGklx7z_400x400.jpg"
echo "  ✓ Gautam Ajjarapu (@gautamka)"
curl -sL -o images/founders/vishnu-chakroborty.jpg "https://pbs.twimg.com/profile_images/1534237084025757696/C81wPUeG_400x400.jpg"
echo "  ✓ Vishnu Chakroborty (@vishnuchakrobo)"
curl -sL -o images/founders/sameer-kapur.jpg "https://pbs.twimg.com/profile_images/1536798740383772678/TITYWiik_400x400.jpg"
echo "  ✓ Sameer Kapur (@sameerskapur)"

echo ""
echo "════════════════════════════════════════════════════"
echo "  Downloaded 24 of 31 founder headshots!"
echo "════════════════════════════════════════════════════"
echo ""
echo "MANUAL DOWNLOADS NEEDED (7 founders without public Twitter photos):"
echo "Save each as a 400x400 jpg to images/founders/"
echo ""
echo "  1. Wee Kee Tiew (Virtuals) → wee-kee-tiew.jpg"
echo "     LinkedIn: https://linkedin.com/in/weekeee"
echo ""
echo "  2. Adam Balogh (OpenGradient CTO) → adam-balogh.jpg"
echo "     LinkedIn: https://linkedin.com/in/adbalogh"
echo ""
echo "  3. Somi Agarwal (Synthefy CEO) → somi-agarwal.jpg"
echo "     LinkedIn: https://linkedin.com/in/shubhankar-agarwal"
echo ""
echo "  4. Sandeep Pyapali (Mesta CEO) → sandeep-pyapali.jpg"
echo "     LinkedIn: https://linkedin.com/in/sandeep-pyapali"
echo ""
echo "  5. Kiran Polavarapu (Mesta) → kiran-polavarapu.jpg"
echo "     LinkedIn: https://linkedin.com/in/kiranpolavarapu"
echo ""
echo "  6. Don Morton (Robo CEO) → don-morton.jpg"
echo "     LinkedIn: https://linkedin.com/in/donmorton"
echo ""
echo "  7. Kyle Noble (Robo) → kyle-noble.jpg"
echo "     LinkedIn: https://linkedin.com/in/kylenoble1"
echo ""
echo "  8. Nishank Gite (Nirvana AI CTO) → nishank-gite.jpg"
echo "     LinkedIn: https://linkedin.com/in/nishank-gite"
