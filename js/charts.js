/**
 * Chart.js visualizations — MorningRoutineTracker statistics section
 */

let pieChartInstance = null;
let barChartInstance = null;

const CHART_COLORS = {
  primary:       '#1565C0',
  secondary:     '#42A5F5',
  primaryLight:  'rgba(21, 101, 192, 0.7)',
  secondaryLight:'rgba(66, 165, 245, 0.7)',
};

function getChartTextColor() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? '#e9ecef' : '#495057';
}

function initCharts() {
  if (typeof Chart === 'undefined') return;
  const textColor = getChartTextColor();
  Chart.defaults.color       = textColor;
  Chart.defaults.font.family = "'Poppins', sans-serif";
  renderPieChart(textColor);
  renderBarChart(textColor);
}

function renderPieChart(textColor) {
  const canvas = document.getElementById('pieChart');
  if (!canvas) return;
  if (pieChartInstance) pieChartInstance.destroy();

  // Data: Gore M & Morgan J, Indian Journal of Psychological Medicine (SAGE, 2024)
  // Pooled prevalence 7.1% among Indian children and adolescents
  pieChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['ADHD (India ~7.1%)', 'Other Children (~92.9%)'],
      datasets: [{
        data: [7.1, 92.9],
        backgroundColor: [CHART_COLORS.primary, CHART_COLORS.secondary],
        borderWidth: 0,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: textColor, padding: 16, font: { size: 13 } },
        },
        title: {
          display: true,
          text: 'Estimated ADHD Prevalence in India (Pooled, 2024)',
          color: textColor,
          font: { size: 15, weight: '600' },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${ctx.parsed}%`,
          },
        },
      },
      animation: { animateRotate: true, duration: 1200 },
    },
  });
}

function renderBarChart(textColor) {
  const canvas = document.getElementById('barChart');
  if (!canvas) return;
  if (barChartInstance) barChartInstance.destroy();

  // Sources:
  //   India pooled 7.1%    — Gore & Morgan, IJPSYM SAGE 2024
  //   Kancheepuram 8.8%    — Catherine AV et al., Indian J Psychiatry 2019 (PMC6532466)
  //   Coimbatore 11.32%    — Venkata JA & Panicker AS, IJPSYM 2013 (PMC3890923)
  //   Global average 5.0%  — Polanczyk et al., commonly cited benchmark
  barChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: [
        'India\n(Pooled)',
        'Tamil Nadu\nKancheepuram',
        'Tamil Nadu\nCoimbatore',
        'Global\nAverage',
      ],
      datasets: [{
        label: 'Prevalence (%)',
        data: [7.1, 8.8, 11.32, 5.0],
        backgroundColor: [
          CHART_COLORS.primary,
          CHART_COLORS.primaryLight,
          CHART_COLORS.secondaryLight,
          CHART_COLORS.secondary,
        ],
        borderRadius: 10,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: 'ADHD Prevalence: India vs Tamil Nadu vs Global',
          color: textColor,
          font: { size: 15, weight: '600' },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.parsed.y}%`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 15,
          ticks: {
            color: textColor,
            callback: (v) => `${v}%`,
          },
          grid: { color: 'rgba(128,128,128,0.15)' },
        },
        x: {
          ticks: {
            color: textColor,
            font: { size: 11 },
          },
          grid: { display: false },
        },
      },
      animation: { duration: 1200, easing: 'easeOutQuart' },
    },
  });
}

function refreshChartsForTheme() {
  initCharts();
}
