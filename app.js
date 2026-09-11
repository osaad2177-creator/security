// =========================================================
// ضع هنا رابط Google Apps Script Web App بعد نشره (انظر خطوات النشر)
// مثال: https://script.google.com/macros/s/XXXXXXXXXXXXXXXX/exec
// =========================================================
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxOi_wAe5I2SFSszU1feaOtXPSr_nQDMyCcKnM9y9vZRlb1ao03O8gXjebo6c_xAqVC/exec";

const form = document.getElementById("applyForm");
const submitBtn = document.getElementById("submitBtn");
const locateBtn = document.getElementById("locateBtn");
const locationStatus = document.getElementById("locationStatus");
const formMessage = document.getElementById("formMessage");
const phoneInput = document.getElementById("phone");
const phoneHint = document.getElementById("phoneHint");
const successMessage = document.getElementById("successMessage");
const consentCheckbox = document.getElementById("consent");

let capturedLocation = null; // { lat, lng, mapsUrl }

// رقم مصري صحيح: يبدأ بـ 01 ثم رقم من 0/1/2/5 ثم 8 أرقام (11 رقمًا إجمالاً)
const EGYPT_PHONE_REGEX = /^01[0125][0-9]{8}$/;

function setLocationStatus(text, state) {
  locationStatus.textContent = text;
  locationStatus.classList.remove("ok", "error");
  if (state) locationStatus.classList.add(state);
}

function updateSubmitState() {
  submitBtn.disabled = !capturedLocation;
}

function requestLocation() {
  formMessage.textContent = "";
  locateBtn.hidden = true;

  if (!navigator.geolocation) {
    setLocationStatus("المتصفح لا يدعم تحديد الموقع.", "error");
    formMessage.textContent = "لا يمكن إرسال الطلب بدون الموافقة على مشاركة الموقع.";
    capturedLocation = null;
    updateSubmitState();
    return;
  }

  setLocationStatus("جاري تحديد الموقع...");

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

      capturedLocation = { lat, lng, mapsUrl };

      setLocationStatus("✔ تم تحديد الموقع", "ok");
      locateBtn.hidden = true;
      formMessage.textContent = "";
      updateSubmitState();
    },
    (error) => {
      capturedLocation = null;
      updateSubmitState();

      let msg = "تعذر تحديد الموقع.";
      if (error.code === error.PERMISSION_DENIED) {
        msg = "تم رفض إذن الموقع.";
      }
      setLocationStatus(msg, "error");
      formMessage.textContent = "لا يمكن إرسال الطلب بدون الموافقة على مشاركة الموقع.";

      // نظهر زر إعادة المحاولة فقط عند الفشل أو الرفض
      locateBtn.textContent = "إعادة محاولة تحديد الموقع";
      locateBtn.hidden = false;
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

// نطلب الموقع تلقائيًا فور تحميل الصفحة
requestLocation();

locateBtn.addEventListener("click", requestLocation);

phoneInput.addEventListener("input", () => {
  phoneInput.value = phoneInput.value.replace(/[^0-9]/g, "");
  if (phoneInput.value && !EGYPT_PHONE_REGEX.test(phoneInput.value)) {
    phoneHint.textContent = "أدخل رقم هاتف مصري صحيح (مثال: 01012345678)";
  } else {
    phoneHint.textContent = "";
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formMessage.textContent = "";

  const fullName = document.getElementById("fullName").value.trim();
  const phone = phoneInput.value.trim();
  const workLocation = document.getElementById("workLocation").value;

  if (!fullName) {
    formMessage.textContent = "من فضلك أدخل الاسم بالكامل.";
    return;
  }
  if (!EGYPT_PHONE_REGEX.test(phone)) {
    formMessage.textContent = "من فضلك أدخل رقم هاتف مصري صحيح.";
    return;
  }
  if (!workLocation) {
    formMessage.textContent = "من فضلك اختر مكان العمل.";
    return;
  }
  if (!capturedLocation) {
    formMessage.textContent = "لا يمكن إرسال الطلب بدون الموافقة على مشاركة الموقع.";
    return;
  }
  if (!consentCheckbox.checked) {
    formMessage.textContent = "يجب الموافقة على مشاركة البيانات والموقع أولاً.";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "جاري الإرسال...";

  try {
    const payload = new URLSearchParams();
    payload.append("fullName", fullName);
    payload.append("phone", phone);
    payload.append("workLocation", workLocation);
    payload.append("latitude", capturedLocation.lat);
    payload.append("longitude", capturedLocation.lng);
    payload.append("mapsUrl", capturedLocation.mapsUrl);

    const response = await fetch(WEB_APP_URL, {
      method: "POST",
      body: payload,
    });

    let ok = response.ok;
    try {
      const data = await response.json();
      ok = ok && data.result === "success";
    } catch (_) {
      // إذا لم يُرجع الخادم JSON، نعتمد فقط على response.ok
    }

    if (!ok) throw new Error("Submission failed");

    form.hidden = true;
    successMessage.hidden = false;
  } catch (err) {
    formMessage.textContent = "حدث خطأ أثناء إرسال الطلب. حاول مرة أخرى.";
    submitBtn.disabled = false;
    submitBtn.textContent = "إرسال الطلب";
  }
});
