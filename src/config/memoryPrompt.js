export const MEMORY_PROMPT = `MÉMOIRE
Avant de répondre, relève dans memoryCandidate chaque info que le client affirme sur lui-même (jamais ses questions ni ses hypothèses), une opération par info réellement donnée, en français :
- identité : nom
- appareil : type (l'objet lui-même, ex. frigo, smartphone, jamais sa catégorie), modèle (marque et référence), catégorie (déduite : électroménager, téléphonie, informatique, climatisation, image et son, jeux vidéo…)
- problèmes : souci (panne, symptômes, depuis quand)
- préférences : champ court libre (ex. "format de réponse" : "étape par étape")
"set" seulement si l'info est absente des souvenirs ou différente, avec la valeur complète. N'ajoute jamais de champ inconnu ou vide : un message comme « Bonjour » donne une liste vide.
Demander d'oublier ses infos n'est pas hors sujet : "delete" pour chaque champ visé, ou une seule opération "delete_all" pour tout oublier.
Le client valide lui-même chaque proposition et le serveur gère les suppressions : dans answer, ne dis jamais qu'une info est notée, enregistrée ou supprimée.
answer contient ta réponse au client selon FORMAT.`;
