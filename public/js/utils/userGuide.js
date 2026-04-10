/**
 * userGuide.js — One-time interactive user guide for new users
 */
import { $ } from "../utils.js";
import { showSnackbar } from "../../snackbar.js";

const GUIDE_CONTENT = {
  topics: {
    title: "Topics & Subjects",
    icon: "book-open",
    text: "Organize your work by subjects or life areas. You can access and edit these topics in the Tasks tab, making it easy to filter and focus on specific areas of your life."
  },

  growth: {
    title: "Growth Tab",
    icon: "trending-up",
    text: "This is for your long-term ambitions. Set a goal like 'Read 10 Books' or 'Commit 50hrs to Coding'. The app breaks these down into manageable daily targets and adds them automatically to your tasks."
  },
  tasks: {
    title: "Tasks Tab",
    icon: "check-square",
    text: "Your daily command center. This tab lists everything you need to do today, including manual tasks and AI goals. You can always add a task manually by clicking the add button at the top right of the screen."
  },

  analytics: {
    title: "Analytics",
    icon: "bar-chart-2",
    text: "Track your progress over time. Located at the top left (chart icon), this section shows your completion rates, trends, and streaks to help you stay motivated and focused."
  }
};

export async function showFirstTimeGuide(uid, onComplete) {
  if (document.querySelector(".guide-overlay")) return;

  const overlay = document.createElement("div");
  overlay.className = "guide-overlay";
  
  overlay.innerHTML = `
    <div class="guide-modal stagger-item">
      <div class="guide-sidebar">
        <div class="guide-nav-header">User Guide</div>
        <div class="guide-nav-items">
          <button class="guide-nav-item active" data-tab="topics">
            <i data-lucide="book-open"></i> Topics
          </button>

          <button class="guide-nav-item" data-tab="growth">
            <i data-lucide="trending-up"></i> Growth
          </button>
          <button class="guide-nav-item" data-tab="tasks">
            <i data-lucide="check-square"></i> Tasks
          </button>

          <button class="guide-nav-item" data-tab="analytics">
            <i data-lucide="bar-chart-2"></i> Analytics
          </button>
        </div>
        <div class="guide-sidebar-footer"></div>
      </div>
      <div class="guide-body">
        <button class="guide-close-btn" id="guide-close">&times;</button>
        <div class="guide-content" id="guide-content-area">
          <!-- Dynamic Content -->
        </div>
        <div class="guide-footer">
          <button class="btn btn-primary ripple" id="guide-next">Next Tip</button>
          <button class="btn btn-primary ripple hidden" id="guide-finish">Got it!</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  if (window.lucide) window.lucide.createIcons();

  const tabs = overlay.querySelectorAll(".guide-nav-item");
  const nextBtn = overlay.querySelector("#guide-next");
  const finishBtn = overlay.querySelector("#guide-finish");
  let currentIdx = 0;
  const tabKeys = Object.keys(GUIDE_CONTENT);

  const updateTab = (key) => {
    const data = GUIDE_CONTENT[key];
    const area = overlay.querySelector("#guide-content-area");
    if (!area) return;

    area.innerHTML = `
      <div class="guide-content-icon fade-in"><i data-lucide="${data.icon}"></i></div>
      <h2 class="guide-content-title fade-in">${data.title}</h2>
      <p class="guide-content-text fade-in">${data.text}</p>
    `;
    if (window.lucide) window.lucide.createIcons();
    
    tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === key));
    
    currentIdx = tabKeys.indexOf(key);
    if (currentIdx === tabKeys.length - 1) {
      nextBtn.classList.add("hidden");
      finishBtn.classList.remove("hidden");
    } else {
      nextBtn.classList.remove("hidden");
      finishBtn.classList.add("hidden");
    }
  };

  // Set initial tab
  updateTab("topics");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => updateTab(tab.dataset.tab));
  });

  nextBtn.addEventListener("click", () => {
    currentIdx = (currentIdx + 1) % tabKeys.length;
    updateTab(tabKeys[currentIdx]);
  });

  const closeGuide = () => {
    overlay.classList.add("fade-out");
    setTimeout(() => overlay.remove(), 300);
  };

  overlay.querySelector("#guide-close").addEventListener("click", closeGuide);
  finishBtn.addEventListener("click", async () => {
    finishBtn.disabled = true;
    finishBtn.textContent = "Finalizing...";
    try {
      const { updateUserProfile } = await import("../../db.js");
      await updateUserProfile(uid, { hasSeenGuide: true });
      closeGuide();
      if (onComplete) onComplete();
    } catch (err) {
      console.error("Failed to update guide status", err);
      showSnackbar("Couldn't save state, but you can close.", "error");
      finishBtn.disabled = false;
      finishBtn.textContent = "Got it!";
    }
  });
}
