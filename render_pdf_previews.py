import fitz  # PyMuPDF
import os

doc = fitz.open("Egor_Baklykov_AI_Portfolio_Presentation.pdf")
os.makedirs("slides_preview", exist_ok=True)

print(f"Total pages: {len(doc)}")
for i, page in enumerate(doc):
    pix = page.get_pixmap(dpi=150)
    out_path = f"slides_preview/slide_{i+1:02d}.png"
    pix.save(out_path)
    print(f"Saved: {out_path} ({pix.width}x{pix.height})")

print("All slides rendered!")
