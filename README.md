# Sowcea — Legal Hub

La conformité de l'écosystème, mesurée. Module `legal-hub` · Triad Governance · accent `#00b6b4`.

- Catalogue d'obligations : `public.v_legal_requirements` (clé, juridiction, régime, autorité, base légale, source, sévérité, état de revue).
- Couverture : `v_legal_country_matrix` (par pays) et `v_legal_vertical_coverage` (par section × catégorie du catalogue de services).
- Confidentialité : `v_processing_register` — registre des traitements RGPD art. 30, transferts hors UE mis en évidence.
- Restrictions de contenu : `v_legal_content_restrictions` + `v_legal_restrictions_due_review` (revues à échéance).
- Pages légales : `public.legal_pages` + `v_geo_country_legal_coverage` (localisé / repli générique / manquant).
- Sources : `v_legal_source_freshness` — fraîcheur, statut HTTP, obligations rattachées.

Vite + React + shadcn. Pré-requis universels A·B·C·D·E installés (porte de pays, sino, Validation Mode, dashboard Global Hub, agent du module).
Déploiement : Cloudflare Pages (`deploy-module-staging.sh` / `promote-to-live.sh`).
**Aucune donnée inventée** : une vue vide donne « Aucune donnée mesurée », jamais un chiffre de remplissage.
