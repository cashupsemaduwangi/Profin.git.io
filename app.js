// Variabel global untuk Chart
let myChart;

// Fungsi Pembantu: Menghapus format ribuan untuk perhitungan
function getRawNumber(formattedValue) {
  if (!formattedValue) return 0;
  // Hapus semua titik (.) dan koma (,)
  return (
    parseFloat(
      formattedValue.toString().replace(/\./g, "").replace(/,/g, "."),
    ) || 0
  );
}

// Fungsi Pembantu: Format input menjadi format Rupiah dengan titik ribuan
function formatRupiah(number) {
  if (isNaN(number) || number === null) return "";
  return number.toLocaleString("id-ID");
}

// Fungsi Utama untuk Format Input saat diketik
function formatRupiahInput(event) {
  const input = event.target;
  let rawValue = getRawNumber(input.value);

  // Terapkan format ribuan
  input.value = formatRupiah(rawValue);

  // Simpan nilai mentah ke input tersembunyi (jika ada)
  const rawInputId = input.id + "-raw";
  const rawInput = document.getElementById(rawInputId);
  if (rawInput) {
    rawInput.value = rawValue;
  }
}

// Function untuk menambah kolom input dinamis
function addItem(category, isDefault = false) {
  const container = document.getElementById(`${category}-inputs`);
  const newItem = document.createElement("div");
  newItem.className = "input-group mb-2";

  let placeholderText;
  let categoryClass = `${category}-item`;

  switch (category) {
    case "needs":
      placeholderText = isDefault
        ? "Sewa/Cicilan Pokok/Makan"
        : "Nama Kebutuhan";
      break;
    case "wants":
      placeholderText = isDefault ? "Hobi/Jajan/Liburan" : "Nama Keinginan";
      break;
    case "savings":
      placeholderText = isDefault
        ? "Investasi/Tabungan Masa Depan"
        : "Nama Alokasi";
      break;
  }

  newItem.innerHTML = `
        <input type="text" class="form-control" placeholder="${placeholderText}">
        <input type="text" class="form-control nominal-input ${categoryClass}" placeholder="Nominal IDR" value="${
          isDefault ? "" : ""
        }">
        <input type="hidden" class="nominal-raw ${categoryClass}-raw">
        ${
          !isDefault
            ? '<button class="btn btn-danger remove-item" type="button">X</button>'
            : ""
        }
    `;
  container.appendChild(newItem);

  // Tambahkan event listener untuk format input
  const nominalInput = newItem.querySelector(".nominal-input");
  const rawInput = newItem.querySelector(".nominal-raw");

  // Gunakan event listener yang sama untuk format rupiah
  nominalInput.addEventListener("input", function (e) {
    formatRupiahInput(e);
    // Secara manual simpan nilai mentah ke input tersembunyi
    rawInput.value = getRawNumber(nominalInput.value);
  });

  // Menambahkan event listener untuk tombol hapus
  if (!isDefault) {
    newItem
      .querySelector(".remove-item")
      .addEventListener("click", function () {
        newItem.remove();
      });
  }
}

// Event listener utama untuk tombol Analisis
document.getElementById("analyze-btn").addEventListener("click", function () {
  const btn = this;
  const spinner = document.getElementById("loading-spinner");

  // Tampilkan animasi loading
  btn.disabled = true;
  spinner.style.display = "inline-block";
  btn.querySelector("span").textContent = "Menganalisis...";

  // Beri sedikit delay untuk efek animasi
  setTimeout(() => {
    analyzeFinance();
    // Sembunyikan animasi loading
    btn.disabled = false;
    spinner.style.display = "none";
    btn.querySelector("span").textContent = "Analisis Sekarang";
  }, 800);
});

function analyzeFinance() {
  // Ambil nilai mentah (numerik) dari input tersembunyi
  const penghasilan =
    parseFloat(document.getElementById("penghasilan-raw").value) || 0;
  const resultSection = document.getElementById("result-section");

  if (penghasilan <= 0) {
    alert("Harap masukkan Total Penghasilan yang valid.");
    resultSection.classList.add("d-none");
    return;
  }

  // 1. Hitung Target Budget
  const targetNeeds = penghasilan * 0.5;
  const targetWants = penghasilan * 0.3;
  const targetSavings = penghasilan * 0.2;

  // 2. Hitung Realisasi Pengeluaran (Menggunakan nilai mentah dari input tersembunyi)
  const getItemsAndTotal = (className) => {
    let total = 0;
    const items = [];
    // Mengambil semua input tersembunyi yang memiliki nilai mentah
    document.querySelectorAll(`.${className}-raw`).forEach((inputRaw) => {
      const nominal = parseFloat(inputRaw.value) || 0;
      // Mencari input teks terdekat untuk nama item
      const nameInput = inputRaw
        .closest(".input-group")
        .querySelector('input[type="text"]');
      const name = nameInput ? nameInput.value : "Tidak Bernama";

      if (nominal > 0) {
        total += nominal;
        items.push({ name, nominal });
      }
    });
    return { total, items };
  };

  const needsData = getItemsAndTotal("needs-item");
  const wantsData = getItemsAndTotal("wants-item");
  const savingsData = getItemsAndTotal("savings-item");

  const realNeeds = needsData.total;
  const realWants = wantsData.total;
  const realSavings = savingsData.total;

  const totalRealisasi = realNeeds + realWants + realSavings;
  const sisaDana = penghasilan - totalRealisasi;

  // 3. Tentukan Status dan Kriteria Analisis (Logika sama seperti sebelumnya)
  let statusSehat = true;
  const recommendations = [];

  // Kriteria 1: Cek Defisit
  if (realNeeds > targetNeeds || realWants > targetWants) {
    statusSehat = false;
  }

  // Kriteria 2: Cek Alokasi Tabungan
  if (realSavings < targetSavings) {
    statusSehat = false;
  }

  // Kriteria 3: Cek Sisa Dana (Dianggap tidak optimal)
  if (sisaDana > 0) {
    statusSehat = false;
    recommendations.push(
      `Dana Belum Dialokasikan Optimal: Terdapat sisa Rp${formatRupiah(
        sisaDana,
      )} (${((sisaDana / penghasilan) * 100).toFixed(
        2,
      )}%). Alokasikan dana ini ke Tabungan/Investasi untuk mencapai target finansial lebih cepat.`,
    );
  }

  // Kriteria 4: Rasio Utang Tinggi
  const totalCicilanPokok = needsData.items
    .filter(
      (item) =>
        item.name.toLowerCase().includes("cicilan") ||
        item.name.toLowerCase().includes("kpr") ||
        item.name.toLowerCase().includes("utang"),
    )
    .reduce((sum, item) => sum + item.nominal, 0);

  if (totalCicilanPokok > penghasilan * 0.2) {
    statusSehat = false;
    recommendations.push(
      `**Rasio Utang Tinggi**: Pembayaran cicilan pokok (${formatRupiah(
        totalCicilanPokok,
      )}) melebihi 20% dari penghasilan Anda. Segera kurangi beban utang.`,
    );
  }

  // 5. Kumpulkan Rekomendasi
  if (realNeeds > targetNeeds) {
    const defisit = realNeeds - targetNeeds;
    recommendations.push(
      `Kebutuhan Pokok (Needs): Defisit Rp${formatRupiah(
        defisit,
      )}. Coba identifikasi dan pangkas pengeluaran paling boros di kategori ini.`,
    );
    needsData.items
      .sort((a, b) => b.nominal - a.nominal)
      .slice(0, 3)
      .forEach((item) => {
        recommendations.push(
          `Kurangi pengeluaran untuk ${item.name} (${formatRupiah(
            item.nominal,
          )}).`,
        );
      });
  }

  if (realWants > targetWants) {
    const defisit = realWants - targetWants;
    recommendations.push(
      `Keinginan (Wants): Defisit Rp${formatRupiah(
        defisit,
      )}. Kategori ini paling mudah dikontrol, fokus pada pengurangan pengeluaran keinginan.`,
    );
    wantsData.items
      .sort((a, b) => b.nominal - a.nominal)
      .slice(0, 3)
      .forEach((item) => {
        recommendations.push(
          `Kurangi pengeluaran untuk ${item.name} (${formatRupiah(
            item.nominal,
          )}).`,
        );
      });
  }

  if (realSavings < targetSavings) {
    const kurang = targetSavings - realSavings;
    recommendations.push(
      `Alokasi 20% Savings/Investasi: Anda kurang Rp${formatRupiah(
        kurang,
      )} dari target 20% optimal. Prioritaskan alokasi ini sebelum pengeluaran Wants.`,
    );
  }

  // Penentuan Status Akhir & Visualisasi
  let rating = "C";
  let skor = "60";
  let statusColor = "danger";
  let icon = "❌";

  if (statusSehat) {
    statusText = "🎉 KEADAAN KEUANGAN SEHAT!";
    rating = "A+";
    skor = "95";
    statusColor = "success";
    icon = "✅";
  } else {
    statusText = `${icon} TIDAK SEHAT: PERLU PERBAIKAN!`;
    if (recommendations.length <= 2) {
      rating = "B";
      skor = "75";
      statusColor = "warning";
    }
  }

  // 4. Output ke Halaman (dengan Animasi)
  resultSection.classList.remove("d-none");
  resultSection.classList.remove("animated-result");
  void resultSection.offsetWidth;
  resultSection.classList.add("animated-result");

  document.getElementById("status-display").innerHTML = `
        <h4 class="h5">Status Keuangan: <strong class="text-${statusColor}">${statusText}</strong></h4>
        <p>Rating: <strong class="text-${statusColor}">${rating}</strong> | Skor: <strong>${skor}/100</strong></p>
    `;
}
// document.getElementById("ratio-details").innerHTML = `
//       <li class="list-group-item"><strong>Penghasilan Total:</strong> Rp${formatRupiah(
//         penghasilan
//       )}</li>
//       <li class="list-group-item list-group-item-${
//         realNeeds > targetNeeds ? "danger" : "success"
//       }">50% Needs (Target: Rp${formatRupiah(
//   targetNeeds
// )}) - Realisasi: Rp${formatRupiah(realNeeds)}</li>
//       <li class="list-group-item list-group-item-${
//         realWants > targetWants ? "danger" : "success"
//       }">30% Wants (Target: Rp${formatRupiah(
//   targetWants
// )}) - Realisasi: Rp${formatRupiah(realWants)}</li>
//       <li class="list-group-item list-group-item-${
//         realSavings < targetSavings ? "danger" : "success"
//       }">20% Savings (Target: Rp${formatRupiah(
//   targetSavings
// )}) - Realisasi: Rp${formatRupiah(realSavings)}</li>
//       <li class="list-group-item list-group-item-${
//         sisaDana > 0 ? "warning" : "light"
//       }">Sisa Dana Belum Dialokasikan: Rp${formatRupiah(sisaDana)}</li>
//   `;

//   // 5. Rekomendasi
//   const recommendationList = document.getElementById("recommendations");
//   recommendationList.innerHTML = "";

//   if (recommendations.length === 0) {
//     recommendationList.innerHTML =
//       "<li>**PERTTAHANKAN!** Keuangan Anda sudah ideal sesuai aturan 50/30/20.</li>";
//   } else {
//     recommendations.slice(0, 5).forEach((rec) => {
//       const li = document.createElement("li");
//       li.innerHTML = rec;
//       recommendationList.appendChild(li);
//     });
//   }

//   // 6. Tampilkan Diagram (Chart.js)
//   if (myChart) {
//     myChart.destroy();
//   }
//   const ctx = document.getElementById("financeChart").getContext("2d");

//   myChart = new Chart(ctx, {
//     type: "pie",
//     data: {
//       labels: [
//         "Needs (Real)",
//         "Wants (Real)",
//         "Savings/Investasi (Real)",
//         "Sisa Dana",
//       ],
//       datasets: [
//         {
//           data: [realNeeds, realWants, realSavings, sisaDana],
//           backgroundColor: ["#28a745", "#ffc107", "#007bff", "#6c757d"],
//           hoverOffset: 10,
//         },
//       ],
//     },
//     options: {
//       responsive: true,
//       maintainAspectRatio: false,
//       plugins: {
//         legend: { position: "top" },
//         title: { display: true, text: "Visualisasi Realisasi Pengeluaran" },
//       },
//     },
//   });
// }

// // Fungsi untuk mengunduh laporan sebagai PDF
// document.getElementById("download-pdf").addEventListener("click", function () {
//   const element = document.getElementById("pdf-content");

//   const opt = {
//     margin: [0.5, 0.5, 0.5, 0.5],
//     filename: "Laporan_Keuangan_50-30-20.pdf",
//     image: { type: "jpeg", quality: 0.98 },
//     html2canvas: {
//       scale: 2,
//       scrollY: 0,
//       windowWidth: element.scrollWidth,
//       windowHeight: element.scrollHeight,
//     },
//     jsPDF: {
//       unit: "in",
//       format: "a4",
//       orientation: "portrait",
//     },
//   };

//   html2pdf().set(opt).from(element).save();
// });
