drop table if exists user;
create table user (
  user_id integer primary key autoincrement,
  username text not null,
  email text not null,
  pw_hash text not null
);

drop table if exists follower;
create table follower (
  who_id integer,
  whom_id integer
);

drop table if exists message;
create table message (
  message_id integer primary key autoincrement,
  author_id integer not null,
  pub_date text,
  mess_name text,
  votes integer default 0,
  cities_string text
);

drop table if exists element;
create table element (
  element_id integer primary key autoincrement,
  message_id integer not null,
  lat text not null,
  lng text not null,
  name text,
  duration text,
  note text
);

