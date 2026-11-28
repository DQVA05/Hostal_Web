# Fotos de la casa

Huecos preparados en `templates/public/index.html`. Mientras falte un archivo, la página
muestra un marcador «Fotografía pendiente» y no pide la imagen, así que no hay errores 404
ni iconos rotos.

| Archivo | Uso | Proporción | Tamaño | Peso máximo |
|---|---|---|---|---|
| `portada-640.webp` | Portada, pantallas pequeñas | 4:3 | 640 × 480 px | — |
| `portada-1280.webp` | Portada, pantallas grandes | 4:3 | 1280 × 960 px | 200 KB |
| `sala.webp` | Galería «La casa»: sala | 4:3 | 800 × 600 px | 120 KB |
| `habitacion-1.webp` | Galería «La casa»: habitación 1 | 4:3 | 800 × 600 px | 120 KB |
| `habitacion-2.webp` | Galería «La casa»: habitación 2 | 4:3 | 800 × 600 px | 120 KB |
| `habitacion-3.webp` | Galería «La casa»: habitación 3 | 4:3 | 800 × 600 px | 120 KB |
| `exterior.webp` | Galería «La casa»: exterior | 4:3 | 800 × 600 px | 120 KB |

## Notas

- Formato WebP en todos los casos.
- La portada se recorta a 4:3 en el móvil y a 16:9 en el escritorio (`object-fit: cover`):
  deje el motivo principal en el centro de la foto.
- La portada se carga de inmediato (está en la primera pantalla). El resto lleva
  `loading="lazy"`.

## Cómo activar una foto

1. Copie el archivo en esta carpeta con el nombre exacto de la tabla.
2. En `index.html`, descomente la etiqueta `<img>` que está junto al hueco.
3. Borre el `<div class="foto-marcador">` de ese mismo hueco.
4. Revise el texto `alt` para que describa lo que se ve en la foto.
