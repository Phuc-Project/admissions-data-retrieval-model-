import sys
sys.path.insert(0, ".")
sys.stdout.reconfigure(encoding="utf-8")
from app.crawler.tuyensinh247 import TuyenSinh247Crawler
from app.crawler.vietnamnet import VietnamNetExamCrawler
from app.crawler.gemini_extractor import GeminiUnstructuredExtractor

def test_tuyensinh247_table_parser():
    sample_html = """
    <div>
        <h2>Điểm chuẩn theo phương thức Điểm thi THPT năm 2025</h2>
        <table>
            <thead>
                <tr>
                    <th>Tên ngành</th>
                    <th>Tổ hợp môn</th>
                    <th>Điểm chuẩn</th>
                    <th>Ghi chú</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Khoa học máy tính (IT1)</td>
                    <td>A00; A01</td>
                    <td>29.25</td>
                    <td>Tiêu chí phụ: Toán >= 9.0</td>
                </tr>
                <tr>
                    <td>7480103 - Kỹ thuật phần mềm</td>
                    <td>A00, D07</td>
                    <td>28.50</td>
                    <td></td>
                </tr>
            </tbody>
        </table>
    </div>
    """
    crawler = TuyenSinh247Crawler()
    records = crawler.parse(sample_html, uni_code="BKA", uni_name="ĐH Bách Khoa Hà Nội")

    assert len(records) == 2, f"Expected 2 records, got {len(records)}"
    
    # Record 1
    rec1 = records[0]
    assert rec1["uni_code"] == "BKA"
    assert rec1["year"] == 2025
    assert rec1["major_name"] == "Khoa học máy tính (IT1)"
    assert rec1["cutoff_score"] == 29.25
    assert "A00" in rec1["subject_groups"]
    assert "A01" in rec1["subject_groups"]
    assert "Toán" in rec1["note"]

    # Record 2
    rec2 = records[1]
    assert rec2["major_code"] == "7480103"
    assert rec2["major_name"] == "Kỹ thuật phần mềm"
    assert rec2["cutoff_score"] == 28.50
    assert "D07" in rec2["subject_groups"]

    print("✓ TuyenSinh247 Table Parser Test Passed!")

def test_vietnamnet_exam_parser():
    sample_html = """
    <div>
        <table>
            <tr>
                <th>Môn</th>
                <th>Toán</th>
                <th>Văn</th>
                <th>Lí</th>
                <th>Hóa</th>
                <th>Ngoại ngữ</th>
            </tr>
            <tr>
                <td>Điểm</td>
                <td>8.40</td>
                <td>6.75</td>
                <td>6.00</td>
                <td>5.25</td>
                <td>8.00</td>
            </tr>
        </table>
    </div>
    """
    crawler = VietnamNetExamCrawler(year=2024)
    scores = crawler.parse(sample_html, sbd="01000001")

    assert scores is not None
    assert scores["exam_number"] == "01000001"
    assert scores["year"] == 2024
    assert scores["math"] == 8.40
    assert scores["literature"] == 6.75
    assert scores["physics"] == 6.00
    assert scores["chemistry"] == 5.25
    assert scores["foreign_language"] == 8.00
    assert scores["total_score"] > 30.0

    # Also test Format A (2-column key-value rows as on live VietnamNet)
    sample_html_2col = """
    <div>
        <table>
            <tr><th>Môn</th><th>Điểm</th></tr>
            <tr><td>Toán</td><td>8.4</td></tr>
            <tr><td>Ngữ văn</td><td>7.0</td></tr>
            <tr><td>Vật lí</td><td>6.0</td></tr>
            <tr><td>Hóa học</td><td>5.5</td></tr>
            <tr><td>Tiếng Anh</td><td>9.2</td></tr>
        </table>
    </div>
    """
    scores_2col = crawler.parse(sample_html_2col, sbd="01000002")
    assert scores_2col is not None
    assert scores_2col["math"] == 8.4
    assert scores_2col["literature"] == 7.0
    assert scores_2col["physics"] == 6.0
    assert scores_2col["chemistry"] == 5.5
    assert scores_2col["foreign_language"] == 9.2
    assert scores_2col["total_score"] == 36.1

    print("✓ VietnamNet Exam Parser (Horizontal & 2-Column formats) Test Passed!")

def test_gemini_html_cleaner():
    extractor = GeminiUnstructuredExtractor()
    raw_html = """
    <html>
        <head><style>.ad { display: block; }</style></head>
        <body>
            <header><nav><a href="/">Trang chủ</a></nav></header>
            <script>alert('spam');</script>
            <main>
                <h1>Thông báo tuyển sinh Đại học FPT 2026</h1>
                <p>Trường Đại học FPT thông báo điểm chuẩn xét tuyển đợt 1 năm 2026 ngành Công nghệ thông tin là 22.0 điểm.</p>
            </main>
            <footer><p>Bản quyền 2026</p></footer>
        </body>
    </html>
    """
    markdown = extractor.clean_html_to_markdown(raw_html)

    # Verify scripts, styles, nav, footer removed
    assert "alert('spam')" not in markdown
    assert ".ad {" not in markdown
    assert "Bản quyền" not in markdown
    assert "Thông báo tuyển sinh Đại học FPT 2026" in markdown
    assert "22.0 điểm" in markdown

    # Verify hash cache generation
    h = extractor.clean_html_to_markdown(raw_html)
    assert len(h) < len(raw_html)

    print("✓ Gemini HTML Cleaner & Markdownify Test Passed!")

if __name__ == "__main__":
    test_tuyensinh247_table_parser()
    test_vietnamnet_exam_parser()
    test_gemini_html_cleaner()
    print("\nALL UNIT TESTS PASSED 100%!")
