import React from 'react';
import DashboardWidget from '../components/dashboard/DashboardWidget';
import MetricsCard from '../components/dashboard/MetricsCard';
import AdoptionChart from '../components/dashboard/AdoptionChart';
import NotificationCenter from '../components/dashboard/NotificationCenter';

const Dashboard: React.FC = () => {
  // Mock data - will be replaced with real data from lib.rescue and lib.analytics
  const metrics = {
    totalPets: 45,
    successfulAdoptions: 23,
    pendingApplications: 12,
    averageRating: 4.8,
    adoptionRate: 85,
    averageResponseTime: 18, // hours
  };

  const monthlyAdoptions = [
    { month: 'Jan', adoptions: 8 },
    { month: 'Feb', adoptions: 12 },
    { month: 'Mar', adoptions: 15 },
    { month: 'Apr', adoptions: 18 },
    { month: 'May', adoptions: 23 },
    { month: 'Jun', adoptions: 20 },
  ];

  const petStatusDistribution = [
    { name: 'Available', value: 25, color: '#10B981' },
    { name: 'Pending', value: 12, color: '#F59E0B' },
    { name: 'Medical Care', value: 5, color: '#EF4444' },
    { name: 'Foster', value: 3, color: '#8B5CF6' },
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Rescue Dashboard</h1>
        <p>Welcome back! Here's what's happening with your rescue today.</p>
      </div>

      {/* Key Metrics Row */}
      <div className="metrics-grid">
        <MetricsCard
          title="Total Pets"
          value={metrics.totalPets}
          icon="🐕"
          trend={{ value: 5, isPositive: true }}
        />
        <MetricsCard
          title="Successful Adoptions"
          value={metrics.successfulAdoptions}
          icon="❤️"
          trend={{ value: 12, isPositive: true }}
        />
        <MetricsCard
          title="Pending Applications"
          value={metrics.pendingApplications}
          icon="📋"
          trend={{ value: 2, isPositive: false }}
        />
        <MetricsCard
          title="Adoption Rate"
          value={`${metrics.adoptionRate}%`}
          icon="📊"
          trend={{ value: 3, isPositive: true }}
        />
      </div>

      {/* Charts and Analytics Row */}
      <div className="analytics-grid">
        <DashboardWidget title="Monthly Adoptions" className="chart-widget">
          <AdoptionChart data={monthlyAdoptions} />
        </DashboardWidget>

        <DashboardWidget title="Pet Status Distribution" className="status-widget">
          <div className="status-distribution">
            {petStatusDistribution.map((status, index) => (
              <div key={index} className="status-item">
                <div 
                  className="status-indicator" 
                  style={{ backgroundColor: status.color }}
                ></div>
                <span className="status-name">{status.name}</span>
                <span className="status-count">{status.value}</span>
              </div>
            ))}
          </div>
        </DashboardWidget>

        <DashboardWidget title="Recent Activity" className="activity-widget">
          <div className="activity-feed">
            <div className="activity-item">
              <span className="activity-time">2 hours ago</span>
              <span className="activity-text">New application for Buddy received</span>
            </div>
            <div className="activity-item">
              <span className="activity-time">4 hours ago</span>
              <span className="activity-text">Max was adopted by the Johnson family</span>
            </div>
            <div className="activity-item">
              <span className="activity-time">6 hours ago</span>
              <span className="activity-text">Luna's medical checkup completed</span>
            </div>
            <div className="activity-item">
              <span className="activity-time">1 day ago</span>
              <span className="activity-text">New volunteer Sarah joined the team</span>
            </div>
          </div>
        </DashboardWidget>
      </div>

      {/* Notifications */}
      <NotificationCenter />
    </div>
  );
};

export default Dashboard;
