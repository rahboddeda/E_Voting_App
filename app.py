from flask import Flask, request, jsonify, render_template, session, redirect
import json
import random

app = Flask(__name__)
app.secret_key = 'secret'

with open('data/patients.json') as f:
    patients = json.load(f)
with open('data/doctors.json') as f:
    doctors = json.load(f)
with open('data/pharmacists.json') as f:
    pharmacists = json.load(f)

requests_data = {}

@app.route('/')
def home():
    return render_template('login.html')




@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data['username']
    password = data['password']
    role = data['role']

    user_list = {'patient': patients, 'doctor': doctors, 'pharmacist': pharmacists}.get(role, [])
    for user in user_list:
        if user['username'] == username and user['password'] == password:
            session['username'] = username
            session['role'] = role
            return jsonify({'status': 'success', 'role': role})
    return jsonify({'status': 'fail'})

@app.route('/logout')
def logout():
    session.clear()
    return redirect('/')

@app.route('/patient')
def patient():
    if 'username' not in session or session.get('role') != 'patient':
        return redirect('/')
    return render_template('patient.html')


@app.route('/medicines')
def medicines():
    if 'username' not in session or session.get('role') != 'patient':
        return redirect('/')
    return render_template('patient.html')

@app.route('/submit_request', methods=['POST'])
def submit_request():
    if 'username' not in session:
        return jsonify({'status': 'not_logged_in'})
    data = request.json
    code = str(random.randint(100000, 999999))
    requests_data[code] = {
        'patient': session['username'],
        'medicines': data['medicines'],
        'approved': False
    }
    return jsonify({'status': 'sent', 'request_id': code})

@app.route('/doctor')
def doctor():
    if 'username' not in session or session.get('role') != 'doctor':
        return redirect('/')
    return render_template('doctor.html')

@app.route('/get_requests', methods=['GET'])
def get_requests():
    unapproved = {k: v for k, v in requests_data.items() if not v['approved']}
    return jsonify(unapproved)

@app.route('/approve_request', methods=['POST'])
def approve_request():
    data = request.json
    code = data['code']
    if code in requests_data:
        requests_data[code]['approved'] = True
        return jsonify({'status': 'approved'})
    return jsonify({'status': 'not found'})

@app.route('/pharmacist')
def pharmacist():
    if 'username' not in session or session.get('role') != 'pharmacist':
        return redirect('/')
    return render_template('pharmacist.html')

@app.route('/pharmacist_done', methods=['POST'])
def pharmacist_done():
    data = request.json
    code = data['code']
    if code in requests_data and requests_data[code]['approved']:
        del requests_data[code]
        return jsonify({'status': 'deleted'})
    return jsonify({'status': 'not found'})



@app.route('/get_approved', methods=['GET'])
def get_approved():
    approved = {k: v for k, v in requests_data.items() if v['approved']}
    return jsonify(approved)

if __name__ == '__main__':
    app.run(debug=True)
