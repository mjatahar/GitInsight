const state = {
  theme: localStorage.getItem("github-finder-theme") || "dark",
};

const elements = {
  body: document.body,
  searchForm: document.getElementById("searchForm"),
  usernameInput: document.getElementById("usernameInput"),
  themeToggle: document.getElementById("themeToggle"),
  feedback: document.getElementById("feedback"),
  loading: document.getElementById("loading"),
  result: document.getElementById("result"),
  profileCard: document.getElementById("profileCard"),
  featuredCard: document.getElementById("featuredCard"),
  statsGrid: document.getElementById("statsGrid"),
  languageGrid: document.getElementById("languageGrid"),
  summaryGrid: document.getElementById("summaryGrid"),
  repoGrid: document.getElementById("repoGrid"),
  repoCount: document.getElementById("repoCount"),
};

function setTheme(theme) {
  state.theme = theme;
  elements.body.dataset.theme = theme;
  localStorage.setItem("github-finder-theme", theme);
  elements.themeToggle.textContent = theme === "dark" ? "Light Mode" : "Dark Mode";
}

function setLoading(loading) {
  elements.loading.classList.toggle("hidden", !loading);
  elements.loading.setAttribute("aria-hidden", String(!loading));
  if (loading) {
    elements.result.classList.add("hidden");
  }
}

function showError(message) {
  elements.feedback.innerHTML = `<div class="message error">${message}</div>`;
}

function clearError() {
  elements.feedback.innerHTML = "";
}

function formatValue(value) {
  return value || value === 0 ? value : "Not available";
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(value || 0);
}

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getLanguageStats(repositories) {
  const counts = repositories.reduce((accumulator, repository) => {
    const language = repository.language || "Other";
    accumulator[language] = (accumulator[language] || 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(counts)
    .map(([language, count]) => ({
      language,
      count,
      percentage: repositories.length
        ? Math.round((count / repositories.length) * 100)
        : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

function getTopRepository(repositories) {
  if (!repositories.length) {
    return null;
  }

  return [...repositories].sort((a, b) => b.stargazers_count - a.stargazers_count)[0];
}

function renderProfile(user) {
  elements.profileCard.innerHTML = `
    <div class="profile-header">
      <img class="avatar" src="${user.avatar_url}" alt="${user.login} avatar">
      <div>
        <span class="eyebrow">Profile Overview</span>
        <h2 class="profile-name">${user.name || user.login}</h2>
        <p class="profile-username">@${user.login}</p>
        <p class="profile-bio">${user.bio || "No bio available."}</p>
      </div>
    </div>

    <div class="profile-meta">
      <div class="meta-box">
        <span class="meta-label">Location</span>
        <strong>${formatValue(user.location)}</strong>
      </div>
      <div class="meta-box">
        <span class="meta-label">Joined GitHub</span>
        <strong>${formatDate(user.created_at)}</strong>
      </div>
    </div>

    <a class="profile-link" href="${user.html_url}" target="_blank" rel="noreferrer">
      View GitHub Profile
    </a>
  `;
}

function renderFeatured(user, repositories) {
  const topRepository = getTopRepository(repositories);
  const totalStars = repositories.reduce((sum, repo) => sum + repo.stargazers_count, 0);
  const totalForks = repositories.reduce((sum, repo) => sum + repo.forks_count, 0);

  elements.featuredCard.innerHTML = `
    <span class="eyebrow">Profile Highlights</span>
    <h3 class="featured-title">${topRepository ? topRepository.name : "No highlighted repository yet"}</h3>
    <p class="featured-copy">
      ${topRepository
        ? topRepository.description || "This repository has no public description."
        : `${user.login} does not have public repositories to highlight.`}
    </p>

    <div class="featured-metrics">
      <div class="featured-metric">
        <span class="meta-label">Public Repos</span>
        <strong>${formatNumber(user.public_repos)}</strong>
      </div>
      <div class="featured-metric">
        <span class="meta-label">Followers</span>
        <strong>${formatNumber(user.followers)}</strong>
      </div>
      <div class="featured-metric">
        <span class="meta-label">Total Stars</span>
        <strong>${formatNumber(totalStars)}</strong>
      </div>
      <div class="featured-metric">
        <span class="meta-label">Total Forks</span>
        <strong>${formatNumber(totalForks)}</strong>
      </div>
    </div>
  `;
}

function renderStats(user, repositories, languageStats) {
  const totalStars = repositories.reduce((sum, repo) => sum + repo.stargazers_count, 0);
  const totalForks = repositories.reduce((sum, repo) => sum + repo.forks_count, 0);
  const originalRepos = repositories.filter((repo) => !repo.fork).length;
  const topLanguage = languageStats[0]?.language || "N/A";

  const stats = [
    { label: "Public Repositories", value: formatNumber(user.public_repos) },
    { label: "Followers", value: formatNumber(user.followers) },
    { label: "Following", value: formatNumber(user.following) },
    { label: "Total Stars", value: formatNumber(totalStars) },
    { label: "Total Forks", value: formatNumber(totalForks) },
    { label: "Top Language", value: topLanguage },
    { label: "Original Projects", value: formatNumber(originalRepos) },
    { label: "Company", value: formatValue(user.company) },
    { label: "Blog", value: user.blog ? "Available" : "Not listed" },
  ];

  elements.statsGrid.innerHTML = stats
    .map(
      (stat) => `
        <article class="stat-card-item">
          <span class="meta-label">${stat.label}</span>
          <strong class="stat-value">${stat.value}</strong>
        </article>
      `
    )
    .join("");
}

function renderLanguages(languageStats) {
  if (!languageStats.length) {
    elements.languageGrid.innerHTML = `
      <div class="empty-languages">No repository languages available.</div>
    `;
    return;
  }

  elements.languageGrid.innerHTML = languageStats
    .map(
      (item) => `
        <article class="language-card">
          <h4>${item.language}</h4>
          <strong>${item.percentage}%</strong>
          <span class="language-pill">${item.count} repositories</span>
        </article>
      `
    )
    .join("");
}

function renderSummary(user, repositories, languageStats) {
  const topRepository = getTopRepository(repositories);
  const recentRepo = repositories.length
    ? [...repositories].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0]
    : null;

  const insights = [
    {
      title: "Strongest Public Language",
      text: languageStats.length
        ? `${user.login} most frequently uses ${languageStats[0].language} across public repositories.`
        : "No language data is available from public repositories.",
    },
    {
      title: "Top Repository",
      text: topRepository
        ? `${topRepository.name} leads with ${formatNumber(topRepository.stargazers_count)} stars.`
        : "No repository is available to highlight yet.",
    },
    {
      title: "Recent Activity",
      text: recentRepo
        ? `The most recently updated public repository is ${recentRepo.name}.`
        : "No recent public repository activity is available.",
    },
  ];

  elements.summaryGrid.innerHTML = insights
    .map(
      (item) => `
        <article class="summary-card-item">
          <h4>${item.title}</h4>
          <p>${item.text}</p>
        </article>
      `
    )
    .join("");
}

function renderRepositories(repositories) {
  elements.repoCount.textContent = `${repositories.length} repositories`;

  if (!repositories.length) {
    elements.repoGrid.innerHTML = `
      <div class="empty-repos">This user has no public repositories.</div>
    `;
    return;
  }

  elements.repoGrid.innerHTML = [...repositories]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .map(
      (repo) => `
        <article class="repo-card">
          <h4 class="repo-name">${repo.name}</h4>
          <p class="repo-description">${repo.description || "No description available."}</p>
          <div class="repo-meta">
            <span class="repo-pill">Stars: ${formatNumber(repo.stargazers_count)}</span>
            <span class="repo-pill">Forks: ${formatNumber(repo.forks_count)}</span>
            <span class="repo-pill">Language: ${repo.language || "N/A"}</span>
            <span class="repo-pill">Updated: ${formatDate(repo.updated_at)}</span>
          </div>
        </article>
      `
    )
    .join("");
}

async function fetchGitHubProfile(username) {
  const [userResponse, reposResponse] = await Promise.all([
    fetch(`https://api.github.com/users/${username}`),
    fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=100`),
  ]);

  if (userResponse.status === 404) {
    throw new Error("Username not found. Please try another GitHub user.");
  }

  if (!userResponse.ok || !reposResponse.ok) {
    throw new Error("Unable to fetch GitHub data right now.");
  }

  const [user, repositories] = await Promise.all([
    userResponse.json(),
    reposResponse.json(),
  ]);

  return { user, repositories };
}

async function handleSearch(event) {
  event.preventDefault();
  const username = elements.usernameInput.value.trim();

  if (!username) {
    showError("Please enter a GitHub username.");
    return;
  }

  clearError();
  setLoading(true);

  try {
    const { user, repositories } = await fetchGitHubProfile(username);
    const languageStats = getLanguageStats(repositories);

    renderProfile(user);
    renderFeatured(user, repositories);
    renderStats(user, repositories, languageStats);
    renderLanguages(languageStats);
    renderSummary(user, repositories, languageStats);
    renderRepositories(repositories);
    elements.result.classList.remove("hidden");
  } catch (error) {
    elements.result.classList.add("hidden");
    showError(error.message);
  } finally {
    setLoading(false);
  }
}

function bindEvents() {
  elements.searchForm.addEventListener("submit", handleSearch);
  elements.themeToggle.addEventListener("click", () => {
    setTheme(state.theme === "dark" ? "light" : "dark");
  });
}

function init() {
  setTheme(state.theme);
  bindEvents();
}

init();
