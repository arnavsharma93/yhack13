# -*- coding: utf-8 -*-
"""
    MiniTwit
    ~~~~~~~~

    A microblogging application written with Flask and sqlite3.

    :copyright: (c) 2010 by Armin Ronacher.
    :license: BSD, see LICENSE for more details.
"""

import time
from sqlite3 import dbapi2 as sqlite3
from hashlib import md5
from datetime import datetime
from flask import Flask, request, session, url_for, redirect, \
     render_template, abort, g, flash, _app_ctx_stack, jsonify
from werkzeug import check_password_hash, generate_password_hash


# configuration
DATABASE = '/tmp/minitwit.db'
PER_PAGE = 30
DEBUG = True
SECRET_KEY = 'development key'

# create our little application :)
app = Flask(__name__)
app.config.from_object(__name__)
app.config.from_envvar('MINITWIT_SETTINGS', silent=True)


def get_db():
    """Opens a new database connection if there is none yet for the
    current application context.
    """
    top = _app_ctx_stack.top
    if not hasattr(top, 'sqlite_db'):
        top.sqlite_db = sqlite3.connect(app.config['DATABASE'])
        top.sqlite_db.row_factory = sqlite3.Row
    return top.sqlite_db


@app.teardown_appcontext
def close_database(exception):
    """Closes the database again at the end of the request."""
    top = _app_ctx_stack.top
    if hasattr(top, 'sqlite_db'):
        top.sqlite_db.close()


def init_db():
    """Creates the database tables."""
    with app.app_context():
        db = get_db()
        with app.open_resource('schema.sql', mode='r') as f:
            db.cursor().executescript(f.read())
        db.commit()


def query_db(query, args=(), one=False):
    """Queries the database and returns a list of dictionaries."""
    cur = get_db().execute(query, args)
    rv = cur.fetchall()
    return (rv[0] if rv else None) if one else rv


def get_user_id(username):
    """Convenience method to look up the id for a username."""
    rv = query_db('select user_id from user where username = ?',
                  [username], one=True)
    return rv[0] if rv else None


def format_datetime(timestamp):
    """Format a timestamp for display."""
    return datetime.utcfromtimestamp(timestamp).strftime('%Y-%m-%d @ %H:%M')


def gravatar_url(email, size=80):
    """Return the gravatar image for the given email address."""
    return 'http://www.gravatar.com/avatar/%s?d=identicon&s=%d' % \
        (md5(email.strip().lower().encode('utf-8')).hexdigest(), size)


@app.before_request
def before_request():
    g.user = None
    if 'user_id' in session:
        g.user = query_db('select * from user where user_id = ?',
                          [session['user_id']], one=True)

@app.route('/itinerary')
def itinerary():
    """ Displays the itenary from a message"""
    message_id = request.args.get('message_id', 0, type=int)
    print message_id
    print type(message_id)
    elements = query_db("select * from element where element.message_id = ?",
                         [message_id])
    print "elements", elements
    for i in range(len(elements)):
        elements[i] = list(elements[i])

    return jsonify(result = elements)


@app.route('/timeline')
def timeline():
    """Shows a users timeline or if no user is logged in it will
    redirect to the public timeline.  This timeline shows the user's
    messages as well as all the messages of followed users.
    """
    if not g.user:
        return redirect(url_for('public_timeline'))
    return render_template('timeline.html', messages=query_db('''
        select message.*, user.* from message, user
        where message.author_id = user.user_id and (
            user.user_id = ?)
        order by message.pub_date asc limit ?''',
     [session['user_id'], PER_PAGE]))


@app.route('/public')
def public_timeline():
    """Displays the latest messages of all users."""
    return render_template('timeline.html', messages=query_db('''
        select message.*, user.* from message, user
        where message.author_id = user.user_id
        order by message.pub_date asc limit ?''', [PER_PAGE]))


@app.route('/<username>')
def user_timeline(username):
    """Display's a users tweets."""
    profile_user = query_db('select * from user where username = ?',
                            [username], one=True)
    if profile_user is None:
        abort(404)
    followed = False
    if g.user:
        followed = query_db('''select 1 from follower where
            follower.who_id = ? and follower.whom_id = ?''',
            [session['user_id'], profile_user['user_id']],
            one=True) is not None
    return render_template('timeline.html', messages=query_db('''
            select message.*, user.* from message, user where
            user.user_id = message.author_id and user.user_id = ?
            order by message.pub_date asc limit ?''',
            [profile_user['user_id'], PER_PAGE]), followed=followed,
            profile_user=profile_user)

@app.route('/upvote/<message_id>')
def upvote(message_id):
    """Upvote a new message"""
    if 'user_id' not in session:
        abort(401)
    else:
        new_votes = query_db('''select message.votes from message where message_id = ? ''',message_id)
        print new_votes
        if not new_votes:
            new_votes = 0
        else:
            new_votes = new_votes[0][0] + 1
        db = get_db()
        db.execute(''' update message set votes=? where message.message_id=?  ''', (new_votes,message_id))
        db.commit()
        return redirect(url_for('timeline'))

@app.route('/pin', methods = 'GET')
def add_note():
    """Adds the note to itinerary"""
    if not g.user:
        abort(401)
    note = request.args.get('note', "default_note", type=str)
    db = get_db()
    db.execute(''' update element set note=? where message.message_id=?  ''', (new_votes,message_id))
    db.commit()


@app.route('/justdial', methods=['GET'])
def justdial():
    import requests
    from ast import literal_eval

    print "In justdial"

    base_url = 'http://hack2013.justdial.com/index.php'
    event_token = 'R1nev3n7t0k3nd0m'
    token = 'o7YMSTkojMvx8qb'

    city = request.args.get('city_name', "hyderabad", type=str)
    area = request.args.get('area_name', "gachibowli",  type=str)
    query = request.args.get('query', "cab", type=str)


    def get_results(base_url=base_url,event_token=event_token,token=token,query=query,city=city,area=area):
        query = query.replace(' ','+')
        area = area.replace(' ','+')
        query_string = "?event_token=%s&token=%s&q=%s&city=%s&area=%s&geocodes=&num_res=2" %(event_token,token,query,city,area)
        
        r = requests.get(base_url+query_string, timeout=5)
        r = literal_eval(r.text)
        max_rating = -1.0
        key_max = 0
        for i in range(0,len(r)):
            if r[r.keys()[i]]['avg_rating'] > max_rating:
                key_max = r.keys()[i]
        
        return_list = []
        for el in r[key_max]:
            return_list.append([r[key_max][el]])
        somelist = []
        for el in return_list:
            somelist.append(str(el[0]))
        print [somelist]
        return [somelist]
        



        
    print "HERE"

    try :
        return jsonify(result=get_results(query=query))
    except :
        print "Excepting"
        return jsonify(result="")



@app.route('/<username>/follow')
def follow_user(username):
    """Adds the current user as follower of the given user."""
    if not g.user:
        abort(401)
    whom_id = get_user_id(username)
    if whom_id is None:
        abort(404)
    db = get_db()
    db.execute('insert into follower (who_id, whom_id) values (?, ?)',
              [session['user_id'], whom_id])
    db.commit()
    flash('You are now following "%s"' % username)
    return redirect(url_for('user_timeline', username=username))


@app.route('/<username>/unfollow')
def unfollow_user(username):
    """Removes the current user as follower of the given user."""
    if not g.user:
        abort(401)
    whom_id = get_user_id(username)
    if whom_id is None:
        abort(404)
    db = get_db()
    db.execute('delete from follower where who_id=? and whom_id=?',
              [session['user_id'], whom_id])
    db.commit()
    flash('You are no longer following "%s"' % username)
    return redirect(url_for('user_timeline', username=username))

@app.route('/map', methods=['GET', 'POST'])
def go_to_map():
    """
        Go to map form share page.
    """
    if request.method == 'POST': 
        a = request.form['text']
        session['trip_name'] = a
        print  "Trip name", a

    return render_template('hack.html')

# TODO : change the method to POST
@app.route('/add_message', methods=['POST', 'GET'])
def add_message():
    """Registers a new message for the user."""
    if 'user_id' not in session:
        abort(401)
    else:
        db = get_db()

        print request.args

        if 'trip_name' not in session.keys() or session['trip_name'] == '':
            print "no trip name entered"
            session['trip_name'] = "Default"

        a = session['trip_name']
        cities_string = session['cities_string']
        
        db.execute('''insert into message (author_id, pub_date, mess_name, cities_string)
          values (?, ?, ?, ?)''', (session['user_id'],
                                str( datetime.now().date() ), a, cities_string ))
        db.commit()
	message_id = query_db('''select message.message_id from message where message.author_id = ? order by message.message_id desc limit ?''',[session['user_id'],1])


	session['message_id'] = message_id[0][0]
    print "message_id", message_id
    session['trip_name'] = ''
    session['cities_string'] = ''
    return redirect(url_for('timeline'))
    # return jsonify(result=session['message_id'])


@app.route('/add_element')
def add_element():
    """Registers a new element for the message."""
    if 'user_id' not in session:
        abort(401)
    else:
        lat = request.args.get('a', "0", type=str)
        lng = request.args.get('b', "0", type=str)
        name = request.args.get('name', "default_name", type=str)
        message_id = query_db('''select message.message_id from message where message.author_id = ? order by message.message_id desc limit ?''',[session['user_id'],1])
        print message_id
        if message_id == []:
            session['message_id'] = 1
        else:
            session['message_id'] = message_id[0][0] + 1
        print "name", name
        db = get_db()
        db.execute('''insert into element (message_id, lat, lng, name)
                    values (?, ?, ?, ?)''', (session['message_id'],lat,
                                lng, name))
        db.commit()
        print "SESSION", session['message_id']
    return jsonify(result=session['message_id'])

@app.route('/save-cities')
def save_cities():
    """Collects the cities list from javascript and stuffs into
    memory with some pre processing """

    cities_string = request.args.get('cities_string', 'default_cities_string', type=str)
    session['cities_string'] = cities_string
    # db = get_db()
    # db.execute('''insert into message (cities_string) values (?)''', [cities_string])
    # db.commit()
    return jsonify(result=session['cities_string'])


@app.route('/del_element')
def del_element():
    """Deletes an element for the message."""
    if 'user_id' not in session:
        abort(401)
    else:
        lat = request.args.get('a', "0", type=str)
        lng = request.args.get('b', "0", type=str)
        db = get_db()
        db.execute('''delete from element where element.lat = ? and element.lng = ?''', (lat,lng))
        db.commit()
        return jsonify(result=session['message_id'])




@app.route('/', methods=['GET', 'POST'])
def login():
    """Logs the user in."""
    if g.user:
        return redirect(url_for('timeline'))
    error = None
    if request.method == 'POST':
        user = query_db('''select * from user where
            username = ?''', [request.form['username']], one=True)
        if user is None:
            error = 'Invalid username'
        elif not check_password_hash(user['pw_hash'],
                                     request.form['password']):
            error = 'Invalid password'
        else:
            flash('You were logged in')
            session['user_id'] = user['user_id']
            return redirect(url_for('timeline'))
    return render_template('login.html', error=error)

@app.route('/register', methods=['GET', 'POST'])
def register():
    """Registers the user."""
    if g.user:
        return redirect(url_for('timeline'))
    error = None
    if request.method == 'POST':
        if not request.form['username']:
            error = 'You have to enter a username'
        elif not request.form['email'] or \
                 '@' not in request.form['email']:
            error = 'You have to enter a valid email address'
        elif not request.form['password']:
            error = 'You have to enter a password'
        elif request.form['password'] != request.form['password2']:
            error = 'The two passwords do not match'
        elif get_user_id(request.form['username']) is not None:
            error = 'The username is already taken'
        else:
            db = get_db()
            db.execute('''insert into user (
              username, email, pw_hash) values (?, ?, ?)''',
              [request.form['username'], request.form['email'],
               generate_password_hash(request.form['password'])])
            db.commit()
            flash('You were successfully registered and can login now')
            return redirect(url_for('login'))
    return render_template('register.html', error=error)

@app.route('/logout')
def logout():
    """Logs the user out."""
    flash('You were logged out')
    session.pop('user_id', None)
    return redirect(url_for('public_timeline'))


# add some filters to jinja
app.jinja_env.filters['datetimeformat'] = format_datetime
app.jinja_env.filters['gravatar'] = gravatar_url


if __name__ == '__main__':
    init_db()
    app.run()
