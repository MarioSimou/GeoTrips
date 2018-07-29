CREATE TABLE bikes 
(
	bike_id int PRIMARY KEY
);

#COPY bikes(bike_id) FROM '/home/masimou/Desktop/cyclists_network/tfl/csv/bikes.csv' #DELIMITER ',' CSV HEADER;

CREATE TABLE stations
(
	station_id int PRIMARY KEY,
	station_name varchar(250) NOT NULL
);
SELECT AddGeometryColumn('public','stations','location',4326,'Point',2);
#ALTER TABLE stations ALTER COLUMN location SET NOT NULL;

#COPY stations(station_id,station_name) FROM '/home/masimou/Desktop/cyclists_network/#tfl/csv/stations.csv' DELIMITER ',' CSV HEADER;

CREATE TABLE routes
(
	rental_id int PRIMARY KEY,
	start_station_id int NOT NULL,
	start_date timestamp NOT NULL,
	end_station_id int NOT NULL,
	end_date timestamp NOT NULL,
	duration int NOT NULL,
	bike_id int NOT NULL
);

#COPY routes(rental_id,start_station_id, start_date, end_station_id, end_date, #duration, bike_id) FROM '/home/masimou/Desktop/cyclists_network/tfl/csv/routes.csv' #DELIMITER ',' CSV HEADER;

# Insert values
INSERT INTO webapp_stations(station_id,station_name,location) VALUES 
(434, 'Mechanical Workshop Clapham', NULL),
(413, 'Electrical Workshop PS', NULL);

INSERT INTO webapp_stations(station_id,station_name,location) VALUES
(567,'PENTON STREET COMMS TEST TERMINAL _ CONTACT MATT McNULTY',NULL);


# Foreign keys

ALTER TABLE routes
ADD CONSTRAINT routes_startstation_id_fk 
FOREIGN KEY (start_station_id)
REFERENCES stations(station_id);

ALTER TABLE routes
ADD CONSTRAINT routes_endstation_id_fk 
FOREIGN KEY (end_station_id)
REFERENCES stations(station_id);

ALTER TABLE routes
ADD CONSTRAINT routes_bikes_id_fk 
FOREIGN KEY (bike_id)
REFERENCES bikes(bike_id);

# Index Creation
# B-tree -> <,<=,=,>,>=

# Stations
CREATE INDEX webapp_stations_station_name ON webapp_stations USING btree(station_name);
CREATE INDEX stations_station_id_station_name_idx ON webapp_stations USING btree(station_id, station_name);
CREATE INDEX stations_location_id ON webapp_stations USING gist(location);

# index to match the LIKE operator
CREATE INDEX stations_station_name_text_patttern_idx ON webapp_stations(station_name varchar_pattern_ops);

# Routes
CREATE INDEX routes_duration_idx ON webapp_routes USING btree(duration);
CREATE INDEX routes_start_date_idx ON webapp_routes USING btree(start_date);
CREATE INDEX routes_end_date_idx ON webapp_routes USING btree(end_date);
CREATE INDEX routes_bike_id_idx ON webapp_routes USING btree(bike_id);
CREATE INDEX routes_station_pairs_id_idx ON webapp_routes USING btree(station_pairs_id);

# Webapp_stations_pairs_routes
CREATE INDEX webapp_stations_pairs_routes_balanced_ref_dist ON webapp_stations_pairs_routes USING btree(balanced_ref_dist);
CREATE INDEX webapp_stations_pairs_routes_balanced_ref_time ON webapp_stations_pairs_routes USING btree(balanced_ref_time);
CREATE INDEX webapp_stations_pairs_routes_end_station_id ON webapp_stations_pairs_routes USING btree(end_station_id);
CREATE INDEX webapp_stations_pairs_routes_start_station_id ON webapp_stations_pairs_routes USING btree(start_station_id);


#CREATE INDEX routes_all_idx ON routes USING brin(duration,start_station_id,start_date,end_station_id,end_date, bike_id) with (pages_per_range=1);

# Two attributes
#CREATE INDEX routes_bike_id_duration ON routes USING btree(bike_id,duration);
#CREATE INDEX routes_rental_id_bike_id ON routes USING btree(rental_id,bike_id);


#CREATE INDEX routes_start_station_id_duration ON routes USING brin
#(start_station_id, duration);
#CREATE INDEX routes_end_station_id_duration ON routes USING brin(end_station_id, #duration);


