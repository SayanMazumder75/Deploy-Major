# backend/ml/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from scheduler import generate_schedule
from predictor import predict_performance

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "message": "ML API running"})

@app.route('/predict-schedule', methods=['POST'])
def predict_schedule():
    try:
        data = request.json
        exams = data.get('exams', [])
        hours_per_day = data.get('availableHoursPerDay', 4)
        days_per_week = data.get('studyDaysPerWeek', 5)
        start_time = data.get('preferredStartTime', '09:00')
        weak_topics = data.get('weakTopics', [])

        schedule = generate_schedule(exams, hours_per_day, days_per_week, start_time, weak_topics)
        return jsonify({"success": True, "schedule": schedule})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/predict-performance', methods=['POST'])
def predict_perf():
    try:
        data = request.json
        result = predict_performance(data)
        return jsonify({"success": True, **result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/recommend', methods=['POST'])
def recommend():
    try:
        data = request.json
        weak_topics = data.get('weakTopics', [])
        subjects = data.get('subjects', [])
        upcoming_exams = data.get('upcomingExams', [])

        recommendations = []

        # Sort by urgency (days until exam)
        today = datetime.now()
        for exam in upcoming_exams:
            exam_date = datetime.fromisoformat(exam['examDate'][:10])
            days_left = (exam_date - today).days
            urgency = 'critical' if days_left <= 3 else 'high' if days_left <= 7 else 'medium'
            recommendations.append({
                "type": "exam_prep",
                "subject": exam['subject'],
                "message": f"{exam['subject']} exam in {days_left} days. Focus now!",
                "urgency": urgency,
                "daysLeft": days_left,
            })

        # Weak topic recommendations
        for topic in weak_topics[:3]:
            recommendations.append({
                "type": "weak_topic",
                "subject": topic,
                "message": f"You struggled with '{topic}' in viva. Revise it.",
                "urgency": "medium",
            })

        return jsonify({"success": True, "recommendations": recommendations})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5001, debug=True)