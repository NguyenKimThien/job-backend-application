"use client";

import SiteShell from "@/components/SiteShell";
import { FormEvent, useEffect, useState } from "react";
import { portalFetch } from "@/lib/portal-api";

type Experience = {
  tenDonViDaLamViec: string;
  viTriCongViec: string;
  ngayBatDau: string;
  ngayKetThuc: string;
  moTaCongViec: string;
};

type Education = {
  bacHoc: string;
  tenCoSoDaoTao: string;
  chuyenNganh: string;
  namBatDau: string;
  namTotNghiep: string;
  dangHoc: boolean;
  xepLoai: string;
};

const emptyExperience: Experience = {
  tenDonViDaLamViec: "",
  viTriCongViec: "",
  ngayBatDau: "",
  ngayKetThuc: "",
  moTaCongViec: "",
};

export default function ProfilePage() {
  const [message, setMessage] = useState("");
  const [file, setFile] = useState("CV_NguyenVanA.pdf");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState(["ReactJS", "TypeScript", "SQL"]);
  const [experiences, setExperiences] = useState<Experience[]>([
    {
      tenDonViDaLamViec: "Công ty Công nghệ Hà Nội",
      viTriCongViec: "Thực tập sinh Front-end",
      ngayBatDau: "2025-01-01",
      ngayKetThuc: "2025-06-30",
      moTaCongViec: "Xây dựng giao diện React, sửa lỗi và phối hợp kiểm thử sản phẩm.",
    },
  ]);
  const [educations, setEducations] = useState<Education[]>([
    { bacHoc: "Đại học", tenCoSoDaoTao: "Trường Đại học Mở Hà Nội", chuyenNganh: "Công nghệ thông tin", namBatDau: "2022", namTotNghiep: "", dangHoc: true, xepLoai: "Khá" },
  ]);

  useEffect(() => {
    portalFetch<any>("/worker/profile")
      .then((data) => {
        if (data.tepCvUrl) setFile(data.tepCvUrl);
        if (data.kinhNghiemLamViecs?.length) {
          setExperiences(data.kinhNghiemLamViecs.map((item: Record<string, string>) => ({
            tenDonViDaLamViec: item.tenDonVi,
            viTriCongViec: item.viTriCongViec,
            ngayBatDau: item.ngayBatDau?.slice(0, 10) ?? "",
            ngayKetThuc: item.ngayKetThuc?.slice(0, 10) ?? "",
            moTaCongViec: item.moTaCongViec ?? "",
          })));
        }
        if (data.hoSoKyNangs?.length) {
          setSkills(data.hoSoKyNangs.map((item: { kyNang: { tenKyNang: string } }) => item.kyNang.tenKyNang));
        }
        if (data.hocVans?.length) {
          setEducations(data.hocVans.map((item: any) => ({
            bacHoc: item.trinhDo, tenCoSoDaoTao: item.tenCoSoDaoTao,
            chuyenNganh: item.chuyenNganh ?? "", namBatDau: String(item.namBatDau),
            namTotNghiep: item.namTotNghiep ? String(item.namTotNghiep) : "",
            dangHoc: item.dangHoc, xepLoai: item.xepLoai ?? "",
          })));
        }
      })
      .catch(() => undefined);
  }, []);

  function updateExperience(index: number, field: keyof Experience, value: string) {
    setExperiences((items) =>
      items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
    );
  }

  function addSkill() {
    const value = skillInput.trim();
    if (value && !skills.some((skill) => skill.toLowerCase() === value.toLowerCase())) {
      setSkills((items) => [...items, value]);
    }
    setSkillInput("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      await portalFetch("/worker/profile", {
        method: "PATCH",
        body: JSON.stringify({
        hoTen: form.get("hoTen"),
        ngaySinh: form.get("ngaySinh"),
        gioiTinh: form.get("gioiTinh"),
        diaChi: form.get("diaChi"),
        mucLuongMongMuonTu: Number(form.get("mucLuongMongMuon")) || null,
        mucLuongMongMuonDen: Number(form.get("mucLuongMongMuon")) || null,
        diaDiemMongMuon: form.get("diaDiemMongMuon"),
        tepCvUrl: file,
        kinhNghiemLamViecs: experiences.map((item) => ({
          tenDonVi: item.tenDonViDaLamViec,
          viTriCongViec: item.viTriCongViec,
          ngayBatDau: item.ngayBatDau,
          ngayKetThuc: item.ngayKetThuc || null,
          moTaCongViec: item.moTaCongViec,
        })),
        hocVans: educations.map((item) => ({
          trinhDo: item.bacHoc, tenCoSoDaoTao: item.tenCoSoDaoTao,
          chuyenNganh: item.chuyenNganh, namBatDau: item.namBatDau,
          namTotNghiep: item.namTotNghiep, dangHoc: item.dangHoc, xepLoai: item.xepLoai,
        })),
        skills,
      }),
      });
      setMessage("Đã cập nhật hồ sơ.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể cập nhật hồ sơ.");
    }
  }

  return (
    <SiteShell title="Quản lý hồ sơ cá nhân" subtitle="Hoàn thiện hồ sơ để tăng cơ hội được nhà tuyển dụng liên hệ.">
      <section className="container portal-content two-column">
        <aside className="profile-summary content-card">
          <div className="profile-avatar">NA</div><h2>Nguyễn Văn A</h2><p>Lập trình viên Front-end</p>
          <div className="completion"><span><b>Mức độ hoàn thiện</b><b>85%</b></span><i><em style={{ width: "85%" }} /></i></div>
          <nav><a className="active" href="#thong-tin">Thông tin cá nhân</a><a href="#hoc-van">Học vấn</a><a href="#kinh-nghiem">Kinh nghiệm làm việc</a><a href="#ky-nang">Kỹ năng</a><a href="#nguyen-vong">Nguyện vọng việc làm</a><a href="#cv">CV đính kèm</a></nav>
        </aside>

        <form className="content-card profile-form" onSubmit={save}>
          {message && <div className={`form-message ${message.startsWith("Đã") ? "success" : "error"}`}>{message}</div>}

          <section id="thong-tin">
            <div className="card-title"><div><h2>Thông tin cá nhân</h2><p>Thông tin cơ bản hiển thị với nhà tuyển dụng.</p></div></div>
            <div className="form-grid">
              <label className="form-group"><span>Họ và tên</span><input name="hoTen" defaultValue="Nguyễn Văn A" required /></label>
              <label className="form-group"><span>Ngày sinh</span><input name="ngaySinh" type="date" defaultValue="2002-08-15" /></label>
              <label className="form-group"><span>Giới tính</span><select name="gioiTinh" defaultValue="NAM"><option value="NAM">Nam</option><option value="NU">Nữ</option><option value="KHAC">Khác</option></select></label>
              <label className="form-group"><span>Địa chỉ</span><input name="diaChi" defaultValue="Cầu Giấy, Hà Nội" /></label>
            </div>
          </section>

          <section id="hoc-van">
            <div className="card-title"><div><h2>Học vấn</h2><p>Mỗi quá trình đào tạo được tách thành một dòng riêng.</p></div><button className="btn btn-ghost small-btn" type="button" onClick={() => setEducations((items) => [...items, { bacHoc: "", tenCoSoDaoTao: "", chuyenNganh: "", namBatDau: "", namTotNghiep: "", dangHoc: false, xepLoai: "" }])}>＋ Thêm học vấn</button></div>
            <div className="experience-list">
              {educations.map((item, index) => (
                <article className="experience-editor" key={index}>
                  <div className="experience-number"><b>{index + 1}</b><span>Học vấn {index + 1}</span><button type="button" onClick={() => setEducations((items) => items.filter((_, itemIndex) => itemIndex !== index))}>Xóa</button></div>
                  <div className="form-grid">
                    <label className="form-group"><span>Bậc học *</span><select value={item.bacHoc} onChange={(event) => setEducations((list) => list.map((x, i) => i === index ? { ...x, bacHoc: event.target.value } : x))}><option value="">Chọn bậc học</option><option>Trung cấp</option><option>Cao đẳng</option><option>Đại học</option><option>Sau đại học</option></select></label>
                    <label className="form-group"><span>Cơ sở đào tạo *</span><input value={item.tenCoSoDaoTao} onChange={(event) => setEducations((list) => list.map((x, i) => i === index ? { ...x, tenCoSoDaoTao: event.target.value } : x))} required /></label>
                    <label className="form-group"><span>Chuyên ngành</span><input value={item.chuyenNganh} onChange={(event) => setEducations((list) => list.map((x, i) => i === index ? { ...x, chuyenNganh: event.target.value } : x))} /></label>
                    <label className="form-group"><span>Xếp loại</span><input value={item.xepLoai} onChange={(event) => setEducations((list) => list.map((x, i) => i === index ? { ...x, xepLoai: event.target.value } : x))} /></label>
                    <label className="form-group"><span>Năm bắt đầu</span><input type="number" value={item.namBatDau} onChange={(event) => setEducations((list) => list.map((x, i) => i === index ? { ...x, namBatDau: event.target.value } : x))} /></label>
                    <label className="form-group"><span>Năm tốt nghiệp</span><input type="number" value={item.namTotNghiep} disabled={item.dangHoc} onChange={(event) => setEducations((list) => list.map((x, i) => i === index ? { ...x, namTotNghiep: event.target.value } : x))} /></label>
                    <label className="terms full"><input type="checkbox" checked={item.dangHoc} onChange={(event) => setEducations((list) => list.map((x, i) => i === index ? { ...x, dangHoc: event.target.checked } : x))} /> Tôi vẫn đang học tại đây</label>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section id="kinh-nghiem">
            <div className="card-title"><div><h2>Kinh nghiệm làm việc</h2><p>Mỗi công việc đã làm được lưu thành một dòng riêng trong cơ sở dữ liệu.</p></div><button className="btn btn-ghost small-btn" type="button" onClick={() => setExperiences((items) => [...items, { ...emptyExperience }])}>＋ Thêm kinh nghiệm</button></div>
            <div className="experience-list">
              {experiences.map((item, index) => (
                <article className="experience-editor" key={index}>
                  <div className="experience-number"><b>{index + 1}</b><span>Kinh nghiệm {index + 1}</span><button type="button" onClick={() => setExperiences((items) => items.filter((_, itemIndex) => itemIndex !== index))}>Xóa</button></div>
                  <div className="form-grid">
                    <label className="form-group"><span>Tên đơn vị đã làm việc *</span><input value={item.tenDonViDaLamViec} onChange={(e) => updateExperience(index, "tenDonViDaLamViec", e.target.value)} required /></label>
                    <label className="form-group"><span>Vị trí công việc *</span><input value={item.viTriCongViec} onChange={(e) => updateExperience(index, "viTriCongViec", e.target.value)} required /></label>
                    <label className="form-group"><span>Ngày bắt đầu *</span><input type="date" value={item.ngayBatDau} onChange={(e) => updateExperience(index, "ngayBatDau", e.target.value)} required /></label>
                    <label className="form-group"><span>Ngày kết thúc</span><input type="date" value={item.ngayKetThuc} min={item.ngayBatDau} onChange={(e) => updateExperience(index, "ngayKetThuc", e.target.value)} /></label>
                    <label className="form-group full"><span>Mô tả công việc</span><textarea value={item.moTaCongViec} onChange={(e) => updateExperience(index, "moTaCongViec", e.target.value)} /></label>
                  </div>
                </article>
              ))}
              {!experiences.length && <div className="inline-empty">Bạn chưa thêm kinh nghiệm làm việc.</div>}
            </div>
          </section>

          <section id="ky-nang">
            <div className="card-title"><div><h2>Kỹ năng</h2><p>Mỗi kỹ năng là một dòng trong bảng Kỹ năng và liên kết với hồ sơ.</p></div></div>
            <div className="skill-input-row"><input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }} placeholder="Ví dụ: Java, ReactJS, Giao tiếp..." /><button className="btn btn-primary" type="button" onClick={addSkill}>Thêm kỹ năng</button></div>
            <div className="editable-skills">{skills.map((skill) => <span key={skill}>{skill}<button type="button" onClick={() => setSkills((items) => items.filter((item) => item !== skill))}>×</button></span>)}</div>
          </section>

          <section id="nguyen-vong">
            <div className="card-title"><div><h2>Nguyện vọng việc làm</h2><p>Giúp hệ thống gợi ý cơ hội phù hợp hơn.</p></div></div>
            <div className="form-grid"><label className="form-group"><span>Mức lương mong muốn</span><input name="mucLuongMongMuon" type="number" defaultValue="15000000" /></label><label className="form-group"><span>Địa điểm mong muốn</span><input name="diaDiemMongMuon" defaultValue="Hà Nội" /></label></div>
          </section>

          <section id="cv">
            <div className="card-title"><div><h2>CV đính kèm</h2><p>Hỗ trợ PDF hoặc DOCX, dung lượng tối đa 5 MB.</p></div></div>
            <label className="upload-zone"><input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0]?.name || file)} /><span>☁</span><strong>Kéo thả hoặc nhấn để tải CV</strong><small>{file}</small></label>
          </section>
          <div className="form-footer"><button className="btn btn-primary">Lưu toàn bộ hồ sơ</button></div>
        </form>
      </section>
    </SiteShell>
  );
}
