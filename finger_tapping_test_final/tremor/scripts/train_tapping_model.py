import numpy as np
import pandas as pd
from sklearn.model_selection import GroupKFold
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
import json

# Setup random seed for reproducibility
np.random.seed(42)

def generate_participant_data(participant_id, is_parkinson):
    """
    Simulates bilateral clinical trial metrics for a single participant.
    Parkinson's patients display bradykinesia (low frequency, velocity decay, pauses) 
    and hypokinesia (low amplitude) along with rhythm irregularity and asymmetry.
    """
    trials = []
    
    # Asymmetry factor: Parkinson's symptoms usually start or are worse on one side
    side_asymmetry = np.random.uniform(1.2, 2.0) if is_parkinson else np.random.uniform(1.0, 1.15)
    worse_side = np.random.choice(["L", "R"])
    
    for hand in ["R", "L"]:
        is_worse_hand = (hand == worse_side)
        asym_multiplier = side_asymmetry if is_worse_hand else 1.0
        
        if is_parkinson:
            # Parkinsonian movement features
            frequency = np.random.uniform(1.2, 2.7) / (asym_multiplier ** 0.5)
            amplitude_mean = np.random.uniform(0.3, 0.65) / asym_multiplier
            amplitude_dec = np.random.uniform(0.50, 0.82) / (asym_multiplier ** 0.2)
            velocity_mean = np.random.uniform(1.5, 3.5) / asym_multiplier
            velocity_dec = np.random.uniform(0.45, 0.80) / (asym_multiplier ** 0.2)
            rhythm_cv = np.random.uniform(0.18, 0.42) * (asym_multiplier ** 0.3)
            pause_pct = np.random.uniform(2.5, 20.0) * asym_multiplier
            tremor_metric = np.random.uniform(15.0, 75.0)
        else:
            # Healthy control movement features
            frequency = np.random.uniform(3.0, 4.8)
            amplitude_mean = np.random.uniform(0.85, 1.25)
            amplitude_dec = np.random.uniform(0.92, 1.05)
            velocity_mean = np.random.uniform(5.5, 8.5)
            velocity_dec = np.random.uniform(0.88, 1.02)
            rhythm_cv = np.random.uniform(0.04, 0.12)
            pause_pct = np.random.uniform(0.0, 1.5)
            tremor_metric = np.random.uniform(1.0, 8.0)
            
        trials.append({
            "participant_id": participant_id,
            "hand": hand,
            "label": 1 if is_parkinson else 0,
            "frequency": float(frequency),
            "amplitude_mean": float(amplitude_mean),
            "amplitude_dec": float(amplitude_dec),
            "velocity_mean": float(velocity_mean),
            "velocity_dec": float(velocity_dec),
            "rhythm_cv": float(rhythm_cv),
            "pause_pct": float(pause_pct),
            "tremor_metric": float(tremor_metric)
        })
        
    return trials

def main():
    print("=== Parkinson's Motor Tapping screening System Model Training ===")
    print("Generating simulated clinical dataset (120 participants, bilateral trials)...")
    
    all_trials = []
    # 60 Parkinson's patients, 60 Healthy controls
    for p_id in range(1, 61):
        # Healthy
        all_trials.extend(generate_participant_data(f"H_{p_id:03d}", is_parkinson=False))
        # Parkinson's
        all_trials.extend(generate_participant_data(f"P_{p_id:03d}", is_parkinson=True))
        
    df = pd.DataFrame(all_trials)
    print(f"Dataset generated. Shape: {df.shape} (Total trials: {len(df)})")
    
    # Feature columns for model training
    feature_cols = [
        "frequency", "amplitude_mean", "amplitude_dec", 
        "velocity_mean", "velocity_dec", "rhythm_cv", 
        "pause_pct", "tremor_metric"
    ]
    
    X = df[feature_cols].values
    y = df["label"].values
    groups = df["participant_id"].values
    
    # Run GroupKFold cross-validation (5 splits) to prevent patient-data leakage
    gkf = GroupKFold(n_splits=5)
    
    # Initialize trackers
    models = {
        "Logistic Regression": LogisticRegression(C=1.0, max_iter=1000, random_state=42),
        "Support Vector Machine": SVC(C=1.0, probability=True, random_state=42),
        "Random Forest": RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
    }
    
    results = {name: {"accuracy": [], "precision": [], "recall": [], "f1": [], "auc": [], "sensitivity": [], "specificity": []} for name in models}
    
    print("\nEvaluating models using Participant-Level GroupKFold CV...")
    for fold, (train_idx, test_idx) in enumerate(gkf.split(X, y, groups=groups), 1):
        X_train, X_test = X[train_idx], X[test_idx]
        y_train, y_test = y[train_idx], y[test_idx]
        
        # Normalize features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        for name, clf in models.items():
            # Train
            clf.fit(X_train_scaled, y_train)
            
            # Predict
            y_pred = clf.predict(X_test_scaled)
            y_prob = clf.predict_proba(X_test_scaled)[:, 1]
            
            # Metrics
            tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()
            sens = tp / (tp + fn)
            spec = tn / (tn + fp)
            
            results[name]["accuracy"].append(accuracy_score(y_test, y_pred))
            results[name]["precision"].append(precision_score(y_test, y_pred))
            results[name]["recall"].append(recall_score(y_test, y_pred))
            results[name]["f1"].append(f1_score(y_test, y_pred))
            results[name]["auc"].append(roc_auc_score(y_test, y_prob))
            results[name]["sensitivity"].append(sens)
            results[name]["specificity"].append(spec)
            
    # Print CV Results
    best_model_name = ""
    best_f1 = -1
    for name in models:
        print(f"\n--- {name} Results ---")
        avg_acc = np.mean(results[name]["accuracy"])
        avg_prec = np.mean(results[name]["precision"])
        avg_rec = np.mean(results[name]["recall"])
        avg_f1 = np.mean(results[name]["f1"])
        avg_auc = np.mean(results[name]["auc"])
        avg_sens = np.mean(results[name]["sensitivity"])
        avg_spec = np.mean(results[name]["specificity"])
        
        print(f"  Accuracy:    {avg_acc:.4f}")
        print(f"  Precision:   {avg_prec:.4f}")
        print(f"  Recall:      {avg_rec:.4f}")
        print(f"  F1 Score:    {avg_f1:.4f}")
        print(f"  ROC-AUC:     {avg_auc:.4f}")
        print(f"  Sensitivity: {avg_sens:.4f} (Priority for screening)")
        print(f"  Specificity: {avg_spec:.4f} (Priority for screening)")
        
        if avg_f1 > best_f1:
            best_f1 = avg_f1
            best_model_name = name

    print(f"\nBest performing model: {best_model_name}")
    
    # Train final Logistic Regression on the full dataset to extract parameters for Javascript
    print("\nTraining final Logistic Regression model for production deployment...")
    scaler_final = StandardScaler()
    X_scaled = scaler_final.fit_transform(X)
    
    lr_final = LogisticRegression(C=1.0, max_iter=1000, random_state=42)
    lr_final.fit(X_scaled, y)
    
    # Extract weights
    weights = lr_final.coef_[0]
    intercept = lr_final.intercept_[0]
    means = scaler_final.mean_
    scales = scaler_final.scale_
    
    # Generate model config dictionary
    js_model_config = {
        "features": feature_cols,
        "intercept": float(intercept),
        "weights": [float(w) for w in weights],
        "means": [float(m) for m in means],
        "scales": [float(s) for s in scales]
    }
    
    print("\n=== PRODUCTION JS MODEL CONFIGURATION ===")
    print("Copy the following configuration directly into src/utils/tappingModel.js:")
    print(json.dumps(js_model_config, indent=2))
    
    # Write to a reference text file in the scripts folder
    with open("scripts/model_coefficients.json", "w") as f:
        json.dump(js_model_config, f, indent=2)
    print("\nModel configuration saved to scripts/model_coefficients.json")

if __name__ == "__main__":
    main()
