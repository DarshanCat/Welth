import requests
from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

# 1. Create a dummy PDF in memory
pdf_buffer = BytesIO()
c = canvas.Canvas(pdf_buffer, pagesize=letter)
c.drawString(100, 750, "Sample Bank Statement")
c.drawString(100, 730, "01/01/2026 Grocery Store Rs. 500 Dr")
c.drawString(100, 710, "02/01/2026 Salary Credit Rs. 50000 Cr")
c.save()

pdf_buffer.seek(0)

# 2. Upload to the local ML service (Python directly)
url = "http://127.0.0.1:8002/bank-parse/pdf"
files = {'file': ('dummy.pdf', pdf_buffer, 'application/pdf')}

try:
    response = requests.post(url, files=files)
    print("STATUS:", response.status_code)
    print("BODY:", response.text)
except Exception as e:
    print("ERROR:", e)
