import React from 'react';
import './Card.css';

const Card = ({ title, value, icon, trend, color = 'blue', loading = false }) => {
    if (loading) {
        return (
            <div className="card loading">
                <div className="card-skeleton">
                    <div className="skeleton-icon"></div>
                    <div className="skeleton-content">
                        <div className="skeleton-title"></div>
                        <div className="skeleton-value"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`card card-${color}`}>
            <div className="card-content">
                <div className="card-header">
                    <h3 className="card-title">{title}</h3>
                    <span className="card-icon">{icon}</span>
                </div>
                
                <div className="card-body">
                    <p className="card-value">{value}</p>
                    {trend && (
                        <div className={`card-trend ${trend.type}`}>
                            <span className="trend-icon">
                                {trend.type === 'positive' ? '↑' : '↓'}
                            </span>
                            <span className="trend-value">{trend.value}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Card;
