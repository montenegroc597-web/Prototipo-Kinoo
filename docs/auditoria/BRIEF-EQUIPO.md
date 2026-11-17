# Brief del equipo · auditoría de Kinoo y Ver nuevo (F11)

**Para qué sirve esto.** Es el encargo común de los cuatro roles (UX-UI, back, front, tester-integrador). Fija qué hace cada uno, qué archivos toca y el contrato entre front y back, para que puedan trabajar a la vez sin pisarse.

## Qué pidió Camilo

1. Auditar Kinoo y probar que todo esté bien.
2. Dejar un sistema sencillo para que una IA pueda actualizar el front cuando haga falta.
3. Que "lo que dice el mazo de ti" deje de ser un mockup: debe salir de los swipes reales de la persona.
4. Cambiar la pantalla Ver según el diseño `docs/referencias/ver-b7c/` (cartelera + selector de mood de una línea + ticket "Verla ahora" + repisa de ya vistas).
5. Documentar todo.

## Reglas que no se discuten

- Nunca se muestran porcentajes ni números de afinidad a la persona. El diseño de referencia trae `match: 93`: no se usa.
- El front no calcula nada del algoritmo: muestra lo que entrega el back, en su orden.
- Textos con límite de caracteres: `docs/guias/limites-de-texto.md`. Todo texto nuevo lleva límite en `packages/config/data/params.json` y sale recortado del back con `fitText()`.
- Documentos en español, sencillos, cada uno empieza con "Para qué sirve esto" y termina con "Ejemplo con números".
- No inventar resultados: lo que no se probó se dice.
- No tocar `main`, no hacer commit ni push (lo hace el coordinador). No tocar `kinoo-pruebas`.
- Sin nombres de tarot. Atribución de TMDB donde haya datos de películas.
- Lee `AGENTS.md` y `docs/ARQUITECTURA.md` antes de empezar.

## Quién toca qué

| Rol | Archivos propios | No toca |
|---|---|---|
| Back | `packages/**`, `apps/api/**`, `apps/web/src/**` (puente `demo.ts`), `docs/guias/contrato-api.md` | `apps/web/public/**`, `apps/web/e2e/**` |
| UX-UI | `docs/auditoria/ux-ui.md`, `docs/auditoria/especificacion-ver-b7c.md` (solo documentos) | código |
| Front | `apps/web/public/**`, `apps/web/front.manifest.json`, `apps/web/scripts/**`, `docs/guias/actualizar-el-front-con-ia.md` | `packages/**`, `apps/web/src/**` |
| Tester-integrador | `apps/web/e2e/**`, pruebas en `packages/*/test`, `docs/auditoria/INFORME.md`, arreglos pequeños en cualquier parte | rediseños |

## Contrato del puente (`window.KinooDemo`) que se agrega

El back lo implementa en `apps/web/src/demo.ts` apoyado en casos de uso del motor o del núcleo (no lógica suelta en el puente). El front lo consume. Los nombres son fijos; si algo no se puede cumplir, se anota en el reporte.

```ts
// 1. Lo que el mazo dice de ti (sale de las acciones reales; nunca números de afinidad)
KinooDemo.insight(): {
  ready: boolean;            // false si hay muy pocas señales
  title: string;             // "ERES TODO UN ROMÁNTICO" (≤ 24)
  kicker: string;            // "lo que aprendimos de ti" (≤ 28)
  body: string;              // frase en palabras, sin cifras de afinidad (≤ 110)
  traits: { label: string; level: 'alto' | 'medio' | 'bajo' }[];   // hasta 3, label ≤ 16
  moods: { key: string; name: string; level: 'alto' | 'medio' | 'bajo' }[]; // hasta 3
  archetype: { key: string; name: string };
  empty_text: string;        // qué mostrar cuando ready = false (≤ 90)
}

// 2. Cartelera de Ver, por mood (reemplaza el uso suelto de watchQueue en la pantalla)
KinooDemo.billboard(moodKey: string | null): {
  mood: { key: string; name: string; desc: string };   // name ≤ 18, desc ≤ 28
  films: {
    id: string; title: string;            // ≤ watch_title_max
    meta: string;                         // "1 h 44 · Drama · Romance" (≤ watch_meta_max)
    quote: string;                        // por qué hoy, en palabras (≤ watch_why_max)
    poster_url: string | null;
    palette: [string, string, string];    // para la carta sin póster
    starred: boolean;
    providers: { name: string; note: string; rent: boolean }[];  // primero las de la persona
    runtime_min: number;
  }[];
  status: 'ok' | 'empty_hand' | 'empty_mood' | 'empty_platforms';
  notice: string | null;      // en palabras
}
KinooDemo.moods(): { key: string; name: string; desc: string }[]   // incluye "todas" primero

// 3. Repisa: lo que ya vio y calificó
KinooDemo.shelf(): {
  id: string; title: string; poster_url: string | null; palette: [string, string, string];
  when: string;               // "hace 3 semanas" (≤ 18)
  rating: string;             // "¡Me encantó!" (≤ 16)
  back: string;               // razón para volver a verla (≤ 90)
}[]

// 4. Acciones
KinooDemo.star(movieId: string, on: boolean): void      // evento super_liked (ver PREGUNTAS P7.3)
KinooDemo.rewatch(movieId: string): void                 // evento rewatch_intent
// Se mantienen: onWatch(id, 'skip' | 'start', provider), confirmWatch(level), watchQueue(), lastClosing(), profile()
```

Notas para el back:

- `insight` debe servir también para Resumen (`Flujo2_Resumen`), Perfil (`Flujo2c_Perfil`) y el bloque "lo que aprendimos de ti" de Ver. Los niveles `alto / medio / bajo` reemplazan a los porcentajes.
- `super_liked` es un evento nuevo: tipo en `packages/shared/src/events.ts`, peso en `action_weights.json` (propuesta del documento de preguntas: señal +0,8, η 0,12), migración si la tabla de eventos valida el tipo, prueba en `packages/engine/test`. Va anotado en PROGRESS como decisión tomada sin Camilo.
- Cuando una película se califica (`watch_confirmed`), sale de la cartelera y pasa a la repisa.

## Entregable de cada rol

Un reporte corto al coordinador: qué hizo, qué probó (con el comando y el resultado), qué quedó pendiente y qué decisiones tomó.
