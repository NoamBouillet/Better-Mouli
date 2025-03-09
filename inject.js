const projects = {};
const skillsCache = {};
const expandedSkills = {};
let settings = {
  autoExpand: false,
  highContrast: false
};
const sentences = [
    "GG !!"
  ];
browser.storage.local.get(['autoExpand', 'highContrast']).then((result) => {
  settings.autoExpand = result.autoExpand || false;
  settings.highContrast = result.highContrast || false;
});
browser.storage.onChanged.addListener((changes) => {
  if (changes.autoExpand) {
    settings.autoExpand = changes.autoExpand.newValue;
  }
  if (changes.highContrast) {
    settings.highContrast = changes.highContrast.newValue;
    updatePercentages();
  }
});

const styles = `
.epi-percentage-container {
  width: 100%;
  font-family: 'Roboto', sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.epi-progress-bar {
  height: 20px;
  width: 100%; /* Increased width to 80% of its container */
  border-radius: 10px;
  margin: 5px 0;
  background-color: rgba(200, 200, 200, 0.3);
  position: relative;
  overflow: hidden;
}

.epi-progress-fill {
  height: 100%;
  border-radius: 10px;
  transition: width 0.5s ease-in-out;
}

.epi-percentage-text {
  font-weight: 500;
  margin-bottom: 5px;
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.epi-skill-details {
  margin-top: 10px;
  font-size: 14px;
  border-left: 3px solid #ccc;
  padding-left: 10px;
}

.epi-skill-item {
  margin: 8px 0;
  display: flex;
  justify-content: space-between;
}

.epi-skill-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 10px;
}

.epi-skill-status {
  font-weight: 500;
}

.epi-expand-btn {
  background: none;
  border: none;
  color: #3f51b5;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
  font-size: 13px;
  margin-top: 5px;
}

.epi-expand-btn:hover {
  color: #5c6bc0;
}
`;

function debugLog() {
  console.log("EnhancedMouli:", ...arguments);
}

function debugWarn() {
  console.warn("EnhancedMouli:", ...arguments);
}

function debugError() {
  console.error("EnhancedMouli:", ...arguments);
}  

function injectStyles() {
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);
}

function findParentBySelector(node, selector) {
  let cur = node.parentNode;

  while (cur && !cur.matches(selector)) {
    cur = cur.parentNode;
  }
  return cur;
}

document.addEventListener("__xmlrequest", (event) => {
  const elements = JSON.parse(event.detail);

  if (!Array.isArray(elements))
    return;
  
  for (let element of elements) {
    if (typeof element !== "object" || typeof element.project !== "object" || typeof element.project.name !== "string")
      continue;
    
    projects[element.project.name] = element;
    if (element.results && element.results.skills) {
      skillsCache[element.project.name] = element.results.skills;
    }
  }
});

async function loadUserProjects() {
  debugLog("Fetching projects...");
  const [kind, year] = window.location.hash?.split("/");
  if (kind == "p")
    debugLog("History not yet supported!");
  try {
    const token = localStorage.getItem("argos-api.oidc-token").replace(/"/g, "");
    if (!token) {
      debugError("No authentication token found!");
      return;
    }
    const response = await fetch("https://api.epitest.eu/me/" + year, {
      headers: {
        Authorization: "Bearer " + token
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const elements = await response.json();  
    if (!Array.isArray(elements)) {
      debugWarn("Projects JSON is not an array!");
      return;
    }
    for (let element of elements) {
      if (typeof element !== "object" || typeof element.project !== "object" || typeof element.project.name !== "string")
        continue; 
      projects[element.project.name] = element;
      if (element.results && element.results.skills) {
        skillsCache[element.project.name] = element.results.skills;
      }
    }
  } catch (error) {
    debugError("Error fetching projects:", error);
  }
}

function getColorForPercentage(percentage) {
        if (percentage >= 100) {
            return 'background: linear-gradient(45deg, red, orange, yellow, green, blue, indigo, violet);';
        }
        if (percentage >= 90) return '#00c853';
        if (percentage >= 75) return '#64dd17';
        if (percentage >= 50) return '#ffc107';
        if (percentage >= 25) return '#ff9800';
        return '#f44336';
}

function setEnhancedPercentage(statusElement, projectName, percentage, error_label) {
  const container = document.createElement('div');
  container.className = 'epi-percentage-container';

  if (settings.highContrast) {
      container.classList.add('high-contrast');
  }
  if (error_label) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'mdl-color-text--accent';
      errorDiv.style.cssText = 'text-align: center; margin-bottom: 10px; font-weight: bold;';
      errorDiv.textContent = error_label;
      container.appendChild(errorDiv);
  }
  const percentageText = document.createElement('div');
  percentageText.className = 'epi-percentage-text';
  percentageText.innerHTML = percentage <= 0 
    ? "" 
    : (percentage >= 100 
      ? `<span style="display: block; margin-left: 350px; text-align: center; font-size: 24px;">${sentences[Math.floor(Math.random() * sentences.length)]}</span>` 
      : `<span>Passed - ${percentage}%</span><span>${100 - percentage}% remaining</span>`);
  

  const progressBar = document.createElement('div');
  progressBar.className = 'epi-progress-bar';
  const progressFill = document.createElement('div');
  progressFill.className = 'epi-progress-fill';
  progressFill.style.cssText = percentage <= 0
  ? `width: 100%; background-color: ${getColorForPercentage(percentage)};`
  : (percentage >= 100
    ? `width: ${percentage}%; ${getColorForPercentage(percentage)}`
    : `width: ${percentage}%; background-color: ${getColorForPercentage(percentage)}`);

  progressBar.appendChild(progressFill);
  container.appendChild(percentageText);
  container.appendChild(progressBar);

  if (percentage >= 100 || percentage <= 0) {
    statusElement.innerHTML = '';
    statusElement.appendChild(container);
    return;
  }
  if (skillsCache[projectName]) {
      const skills = skillsCache[projectName];
      const skillDetails = document.createElement('div');
      skillDetails.className = 'epi-skill-details';
      skillDetails.style.display = (settings.autoExpand || expandedSkills[projectName]) ? 'block' : 'none';

      const skillsList = Object.entries(skills).map(([skillName, skillData]) => {
          const passRate = skillData.passed / skillData.count * 100;
          const status = skillData.passed === skillData.count ? 'passed' : 'failed';
          return `
              <div class="epi-skill-item" style="padding-left: 70px;">
                <div class="epi-skill-name">${skillName}</div>
                <div class="epi-skill-status epi-skill-${status}">
                  ${skillData.passed}/${skillData.count} (${passRate.toFixed(0)}%)
                </div>
              </div>
            `;
      }).join('');

      skillDetails.innerHTML = skillsList;
      const expandBtn = document.createElement('button');
      expandBtn.className = 'epi-expand-btn';
      expandBtn.textContent = (settings.autoExpand || expandedSkills[projectName]) ? 'Hide skill details' : 'Show skill details';
      expandBtn.onclick = (event) => {
          event.stopPropagation();
          const isHidden = skillDetails.style.display === 'none';
          skillDetails.style.display = isHidden ? 'block' : 'none';
          expandBtn.textContent = isHidden ? 'Hide skill details' : 'Show skill details';
          expandedSkills[projectName] = isHidden;
      };
      container.appendChild(expandBtn);
      container.appendChild(skillDetails);
  }
  statusElement.innerHTML = '';
  statusElement.appendChild(container);
}

async function updatePercentages() {
  debugLog("Updating percentages...");
  document.querySelectorAll(".remove-on-percentage-update").forEach(e => e.remove());
  const projectStatusElements = document.querySelectorAll(".mdl-typography--title-color-contrast.mdl-cell");
  let error_label = null;

  for (const projectStatus of projectStatusElements) {
    if (projectStatus.getAttribute('data-epi-processed') === 'true') {
      continue;
    }
    projectStatus.setAttribute('data-epi-processed', 'true');
    const computedStyle = window.getComputedStyle(projectStatus);
    const textColor = computedStyle.color;
    const rgbValues = textColor.match(/\d+/g);
    if (rgbValues && (parseInt(rgbValues[0]) !== 63 || parseInt(rgbValues[1]) !== 81 || parseInt(rgbValues[2]) !== 181)) {
      error_label = projectStatus.textContent;
      console.log(error_label);
    } else {
      error_label = null;
    }

    const projectCardElement = findParentBySelector(projectStatus, ".mdl-card");
    if (!projectCardElement) {
      debugLog("Project card not found!");
      continue;
    }
    
    const projectNameSpan = projectCardElement.querySelector(".mdl-card__title-text span");
    if (!projectNameSpan) {
      debugLog("Project name span not found!");
      continue;
    }
    
    const projectName = projectNameSpan.textContent.trim();
    if (typeof projects[projectName] === "undefined") {
      debugLog("Project " + projectName + " not fetched yet!");
      await loadUserProjects();
    }
    
    const projectData = projects[projectName];
    if (!projectData || !projectData.results || !projectData.results.skills) {
      debugWarn(`No skill data available for ${projectName}`);
      continue;
    }
    const skillsArr = Object.values(projectData.results.skills);
    const passed = skillsArr.map(s => s.passed).reduce((prev, curr) => prev + curr, 0);
    const count = skillsArr.map(s => s.count).reduce((prev, curr) => prev + curr, 0);
    const percentage = (passed / count * 100).toFixed(0);
    setEnhancedPercentage(projectStatus, projectName, percentage, error_label);
  }
}

function initialize() {
  debugLog("Initializing Enhanced Epitech Percentages...");
  injectStyles();
  const debouncedUpdate = debounce(updatePercentages, 300);
  const observer = new MutationObserver(() => {
    debouncedUpdate();
  });

  observer.observe(document.querySelector("body"), {
    attributes: true,
    subtree: true,
    attributeFilter: ["class"],
  });

  document.querySelector(".mdl-layout__container").addEventListener("click", debouncedUpdate);
  setTimeout(debouncedUpdate, 500);
}

function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

const inject = () => {
  const send = window.XMLHttpRequest.prototype.send;
  
  function sendreplacement(data) {
    if (this.onreadystatechange)
      this._onreadystatechange = this.onreadystatechange;
    
    debugLog("Request: send");
    this.onreadystatechange = onreadystatechangereplacement;
    return send.apply(this, arguments);
  }
  
  function onreadystatechangereplacement(event) {
    try {
      if (event.target.readyState === 4 && event.target.status === 200) {
        const responseContent = event.target.response;
        if (event.target.responseURL.includes("api.epitest.eu")) {
          document.dispatchEvent(new CustomEvent('__xmlrequest', {
            detail: responseContent
          }));
        }
      }
    } catch(ex) { 
      debugError("Error in XHR intercept:", ex);
    }
    
    if (this._onreadystatechange)
      return this._onreadystatechange.apply(this, arguments);
  }
  
  window.XMLHttpRequest.prototype.send = sendreplacement;
  debugLog("XHR Interceptor injected");
};
initialize();
const actualCode = '(' + inject + ')();';
const script = document.createElement('script');
script.textContent = actualCode;
(document.head || document.documentElement).appendChild(script);
script.remove();