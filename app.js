let allEntries = [];
let displayedDate = new Date();

// Load data from localStorage
function loadDataFromLocalStorage() {
  const saved = localStorage.getItem("tourDiaryEntries");
  if (saved) {
    allEntries = JSON.parse(saved);
  }
}

function saveDataToLocalStorage() {
  localStorage.setItem("tourDiaryEntries", JSON.stringify(allEntries));
}

// Show screen
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
  if (screenId === 'calendar') generateCalendar();
  if (screenId === 'events') updateEventList();
}

// Submit form
function submitData(e) {
  e.preventDefault();
  requestNotificationPermission();

  const topic = document.getElementById("topic").value;
  const place = document.getElementById("place").value;
  const purpose = document.getElementById("purpose").value;
  const datetime = document.getElementById("datetime").value;
  const hasAlarm = document.getElementById("alarm").checked;

  const entry = { topic, place, purpose, datetime, hasAlarm };
  allEntries.push(entry);
  saveDataToLocalStorage();

  alert("Data Submitted!");
  e.target.reset();

  generateCalendar();
  updateEventList();
}

// Calendar functions
function generateCalendar() {
  const container = document.getElementById("calendarGrid");
  const monthLabel = document.getElementById("monthLabel");

  const year = displayedDate.getFullYear();
  const month = displayedDate.getMonth();

  monthLabel.textContent = `${displayedDate.toLocaleString('default', { month: 'long' })} ${year}`;

  container.innerHTML = "";

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  for (let i = 0; i < firstDay; i++) {
    const emptyDiv = document.createElement("div");
    container.appendChild(emptyDiv);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const dayDiv = document.createElement("div");
    dayDiv.className = "day";
    dayDiv.innerText = i;
    dayDiv.dataset.date = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
    
    const eventsOnDay = allEntries.filter(e => {
      const d = new Date(e.datetime);
      return d.getDate() === i && d.getMonth() === month && d.getFullYear() === year;
    });

    if (eventsOnDay.length > 0) {
      const dot = document.createElement("div");
      dot.className = "event-dot";
      dayDiv.appendChild(dot);
    }

    dayDiv.addEventListener("click", () => showEventsForDate(dayDiv.dataset.date));
    container.appendChild(dayDiv);
  }
}

function changeMonth(offset) {
  displayedDate.setMonth(displayedDate.getMonth() + offset);
  generateCalendar();
}

function showEventsForDate(dateString) {
  const eventList = document.getElementById("eventList");
  const noEventMessage = document.getElementById("noEventMessage");
  eventList.innerHTML = "";

  const selectedDate = new Date(dateString);
  const filtered = allEntries.filter(e => {
    const d = new Date(e.datetime);
    return d.getDate() === selectedDate.getDate() &&
           d.getMonth() === selectedDate.getMonth() &&
           d.getFullYear() === selectedDate.getFullYear();
  });

  if (filtered.length === 0) {
    noEventMessage.style.display = "block";
    return;
  }

  noEventMessage.style.display = "none";

  filtered.forEach(e => {
    const div = document.createElement("div");
    div.className = "event-entry";
    div.innerHTML = `
      <strong>${e.topic}</strong><br/>
      📍 ${e.place} | 🎯 ${e.purpose}<br/>
      ⏰ ${new Date(e.datetime).toLocaleTimeString()}
      <br/><button onclick='exportEventToPDF(${JSON.stringify(e)})'>Export as PDF</button>
    `;
    eventList.appendChild(div);
  });
}

// Notification Functions
function requestNotificationPermission() {
  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications.");
    return;
  } else if (Notification.permission !== "granted") {
    Notification.requestPermission();
  }
}

function checkAlarms() {
  const now = new Date();
  allEntries.forEach(e => {
    if (e.hasAlarm) {
      const eventTime = new Date(e.datetime);
      const diffMs = eventTime - now;
      if (Math.abs(diffMs) < 60000) {
        showNotification(e);
      }
    }
  });
}

function showNotification(entry) {
  if (Notification.permission === "granted") {
    new Notification("Tour Diary Reminder", {
      body: `Event: ${entry.topic} at ${new Date(entry.datetime).toLocaleTimeString()}`
    });
  }
}

setInterval(checkAlarms, 60000);

// Event List and Filter
function updateEventList() {
  const table = document.getElementById("eventTable");
  const filter = document.getElementById("filterInput").value.toLowerCase();

  table.innerHTML = "<tr><th>Date</th><th>Place</th><th>Purpose</th></tr>";

  const filtered = allEntries.filter(e =>
    e.topic.toLowerCase().includes(filter) ||
    e.place.toLowerCase().includes(filter) ||
    e.purpose.toLowerCase().includes(filter)
  );

  // Sort by date
  filtered.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

  filtered.forEach(e => {
    const date = new Date(e.datetime);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${date.toLocaleDateString()}</td>
      <td>${e.place}</td>
      <td>${e.purpose}</td>
    `;
    table.appendChild(row);
  });
}

// Export CSV
function exportCSV() {
  let csv = "Topic,Place,Purpose,DateTime,HasAlarm\n";
  allEntries.forEach(e => {
    csv += `"${e.topic}","${e.place}","${e.purpose}","${e.datetime}","${e.hasAlarm}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tour_diary.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// Export PDF
function exportEventToPDF(event) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Tour Diary Entry", 10, 10);
  doc.setFontSize(12);
  doc.text(`Topic: ${event.topic}`, 10, 20);
  doc.text(`Place: ${event.place}`, 10, 30);
  doc.text(`Purpose: ${event.purpose}`, 10, 40);
  doc.text(`DateTime: ${new Date(event.datetime).toLocaleString()}`, 10, 50);
  doc.save(`event_${event.topic}.pdf`);
}

// On Load
window.onload = () => {
  loadDataFromLocalStorage();
  requestNotificationPermission();
};
