# Resultados del simulador

Generado: 2026-11-05T03:38:47.728Z · catálogo sintético de 300 películas · `npm run sim`

| Prueba | ¿Pasa? | Criterio | Métricas |
|---|---|---|---|
| Aprende | ✅ | Tras 40 eventos: aciertos del mazo ≥ 2 × mazo al azar y > mazo de las más populares | usuarios: 36 · aciertos_motor: 0.639 · aciertos_azar: 0.1 · aciertos_populares: 0.119 · veces_sobre_azar: 6.39 |
| Personaliza moods | ✅ | Coseno entre las dos recetas personales < 0,8 y mazos que comparten menos de la mitad | coseno_recetas: 0.637 · comparten: 0.2 · coseno_ana_semilla: 0.764 · coseno_leo_semilla: 0.812 · eventos_por_usuario: 60 |
| Responde al cambio | ✅ | Tras cambiar el gusto oculto, el perfil se parece más al gusto nuevo que al viejo en menos de 30 eventos | usuarios: 6 · eventos_peor_caso: 22 · eventos_promedio: 11.7 · por_usuario: 11/5/11/10/22/11 |
| Explica | ✅ | Ninguna explicación contiene números ni % | explicaciones_revisadas: 1810 · con_numeros: 0 |
| Mazo | ✅ | Respeta la receta (posiciones y tamaño), sin repetir director ni películas ya marcadas | mazos_revisados: 181 · receta_respetada: 181 · tamano_completo: 181 · sin_director_repetido: 181 · repetidas_ya_marcadas: 0 · marcadas_por_usuario: 50 |
