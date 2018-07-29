SELECT COUNT(b.station_id) INTO query FROM webapp_boroughs as a, webapp_stations as b WHERE st_contains(a.geom,b.location) AND a.id = 99999 GROUP BY a.id;

-- checks if a table exists
SELECT EXISTS(SELECT * FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'k');

SELECT EXISTS(SELECT * FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'query');


CREATE OR REPLACE FUNCTION find_boroughs_freq() 
RETURNS TRIGGER AS 
$$

DECLARE
num integer;
BEGIN

RAISE NOTICE 'start';

-- counts the stations that are within a borough
num := (SELECT COUNT(b.station_id) FROM webapp_boroughs as a, webapp_stations as b WHERE st_contains(a.geom,b.location) AND a.id =NEW.id GROUP BY a.id);

-- updates the current table
IF num IS NOT NULL THEN	
	EXECUTE format('UPDATE %1$I.%2$I SET freq = %3s::int WHERE id=($1.id)', TG_TABLE_SCHEMA,TG_TABLE_NAME, num::integer) USING NEW;
ELSE
	EXECUTE format('UPDATE %1$I.%2$I SET freq = 0 WHERE id=($1.id)', TG_TABLE_SCHEMA,TG_TABLE_NAME, num::integer) USING NEW;
END IF;  
RETURN NEW;
END;
$$ 
LANGUAGE plpgsql;


-- Creates the trigger
CREATE TRIGGER find_boroughs_freq_trigger 
AFTER INSERT ON webapp_boroughs
FOR EACH ROW EXECUTE PROCEDURE find_boroughs_freq();


-- INSERT a custom borough
CREATE TABLE "webapp_boroughs" ("id" serial NOT NULL PRIMARY KEY, "name" varchar(22) NOT NULL UNIQUE, "gss_code" varchar(9) NOT NULL, "hectares" double precision NOT NULL, "nonld_area" double precision NOT NULL, "geom" geometry(MULTIPOLYGON,4326) NOT NULL, "freq" integer NULL CHECK ("freq" >= 0));
CREATE INDEX "webapp_boroughs_name_c095fe64_like" ON "webapp_boroughs" ("name" varchar_pattern_ops);
CREATE INDEX "webapp_boroughs_geom_id" ON "webapp_boroughs"USING GIST ("geom");



-- freq = 8
INSERT INTO webapp_boroughs(id,name,gss_code,hectares,nonld_area,geom) VALUES (37, 'Marios City','Marios', 3.0,3.0, st_Multi(st_GeomFromText('POLYGON((-0.21935 51.46982,-0.20312 51.46352,-0.21402 51.45504,-0.22480 51.46909,-0.21935 51.46982))',4326)));

-- freq = 0
INSERT INTO webapp_boroughs(id,name,gss_code,hectares,nonld_area,geom) VALUES (38, 'Marios City','Marios', 3.0,3.0, st_Multi(st_GeomFromText('POLYGON((51.46982 -0.21935,51.46352 -0.20312,51.45504 -0.21402,51.46909 -0.22480,51.46982 -0.21935))',4326)));



-- PREPARE STATEMENT FOR psql
PREPARE find_freq(integer) AS SELECT COUNT(b.station_id) FROM webapp_boroughs as a, webapp_stations as b WHERE st_contains(a.geom,b.location) AND a.id = $1 GROUP BY a.id;
-- EXECUTE COMMAND
EXECUTE find_freq(37);


-- drops the trigger
DROP trigger find_boroughs_freq_trigger ON webapp_boroughs;
DROP FUNCTION find_boroughs_freq();

--------------------------------------------------------------------------------------------------------------------------------------------------------------------


-- Create a matrix that contains all the stations id
-- contained stations of a route
SELECT start_station_id as id INTO i FROM webapp_routes as a LEFT JOIN webapp_stations_pairs_routes as b ON a.station_pairs_id = b.id;

SELECT end_station_id as id INTO j FROM webapp_routes as a LEFT JOIN webapp_stations_pairs_routes as b ON a.station_pairs_id = b.id;


-- merged j, it contains also the records of i
INSERT INTO j SELECT * FROM i;

-- create a new ordered table
SELECT id as id INTO k FROM j ORDER BY id;
-- create an index on it
CREATE INDEX id_idx ON k USING btree(id);

-- delete tables i and j
DROP TABLE i,j;

/*
 the current function iterates over the stations of the database, and calculates the corresponded frequency of each station
 frequency -> number of routes that a station has participated
*/
-- webapp_stations Function
CREATE OR REPLACE FUNCTION update_stations_freq()
RETURNS VOID AS $$
DECLARE
station RECORD;
BEGIN
FOR station IN SELECT * FROM webapp_stations LOOP
	RAISE NOTICE 'station : % ', station.station_id;
	UPDATE public.webapp_stations as a SET freq = (SELECT COUNT(*)::int FROM k WHERE id=station.station_id) WHERE a.station_id = station.station_id; 
END LOOP;
END; $$
LANGUAGE plpgsql;
 
SELECT update_stations_freq();


-- webapp_routes update trigger
CREATE OR REPLACE FUNCTION update_routes_station_freq()
RETURNS TRIGGER AS 
$$
DECLARE
start_old_freq integer;
end_old_freq integer;
i RECORD;
BEGIN
RAISE NOTICE 'NEW : %', NEW.station_pairs_id;

SELECT start_station_id,end_station_id INTO i FROM webapp_stations_pairs_routes WHERE id=NEW.station_pairs_id;


start_old_freq := (SELECT freq::int FROM webapp_stations as a WHERE a.station_id = i.start_station_id);
RAISE NOTICE 'start_old_freq : %', start_old_freq;
UPDATE webapp_stations as a SET freq = (start_old_freq + 1) WHERE a.station_id = i.start_station_id;  

end_old_freq := (SELECT freq::int FROM webapp_stations as a WHERE a.station_id = i.end_station_id);
RAISE NOTICE 'end_old_freq : %', end_old_freq; 
UPDATE webapp_stations as a SET freq = (end_old_freq + 1) WHERE a.station_id = i.end_station_id;  
RETURN NEW;
END;
$$
LANGUAGE plpgsql;

-- trigger that is executed after an INSERT statement
CREATE TRIGGER tr_update_routes_station_freq
AFTER INSERT ON webapp_routes
FOR EACH ROW EXECUTE PROCEDURE update_routes_station_freq(); 

-- station 719 and 446 needs to update
-- 719: 98246 -> 98247
-- 446: 101526 -> 101527
INSERT INTO webapp_routes(rental_id,start_date,end_date,duration,bike_id,station_pairs_id) VALUES (999999,'2018-01-01 00:00:00','2018-01-01 00:00:01',240,11834,287869); 
-- see the change
SELECT station_id,station_name,freq FROM webapp_stations WHERE station_id IN (719,446);



CREATE OR REPLACE FUNCTION delete_routes_station_freq()
RETURNS TRIGGER AS 
$$
DECLARE
start_old_freq integer;
end_old_freq integer;
i RECORD;
BEGIN
RAISE NOTICE 'OLD : %', OLD;

SELECT start_station_id,end_station_id INTO i FROM webapp_stations_pairs_routes WHERE id=OLD.station_pairs_id;

-- station which was the starting point of a route
start_old_freq := (SELECT freq::int FROM webapp_stations as a WHERE a.station_id = i.start_station_id );
RAISE NOTICE 'start_old_freq : %', start_old_freq;
UPDATE webapp_stations as a SET freq = (start_old_freq - 1) WHERE a.station_id = i.start_station_id;  

-- station which was the ending point of a route
end_old_freq := (SELECT freq::int FROM webapp_stations as a WHERE a.station_id = i.end_station_id );
RAISE NOTICE 'end_old_freq : %', end_old_freq; 
UPDATE webapp_stations as a SET freq = (end_old_freq - 1) WHERE a.station_id = i.end_station_id;  
RETURN OLD;
END;
$$
LANGUAGE plpgsql;


-- trigger that is executed before a DELETE statement
CREATE TRIGGER tr_delete_routes_station_freq
BEFORE DELETE ON webapp_routes
FOR EACH ROW EXECUTE PROCEDURE delete_routes_station_freq(); 

DELETE FROM webapp_routes WHERE rental_id=999999;

---------------------------------------------------------------------------------------------------------------------------------------------------------------------

-- STATIONS TRIGGER
/*
This function is used with the tr_update_borough_station_freq and triggers whenever a station is added or deleted from the relation. The trigger automatically updates the frequency attribute of webapp_boroughs relation, which corresponds on the stations that are within the area of a borough.
*/

CREATE OR REPLACE FUNCTION update_borough_stations_freq()
RETURNS TRIGGER AS
$$
DECLARE
i RECORD;
old_freq integer;
BEGIN
-- finds the borough that contains the updated/deleted station
SELECT a.id as bid, a.name as name INTO i FROM webapp_boroughs as a, webapp_stations as b WHERE st_contains(a.geom,b.location) AND b.station_id = NEW.station_id;

-- if a borough contains a stations (becasue some stations do not have a location)
IF i.bid IS NOT NULL THEN
	IF TG_OP = 'INSERT' THEN	-- if its an INSERT process
		-- assigns the old frequency on old_freq variable
		old_freq := (SELECT a.freq::integer FROM webapp_boroughs as a WHERE a.id = i.bid );
		RAISE NOTICE 'update borough % (%) frequency % to %', i.name,i.bid, old_freq, old_freq + 1;
		UPDATE webapp_boroughs as a SET freq = old_freq +1 WHERE a.id = i.bid ;	
	END IF;	
END IF;
RETURN NEW;
END; $$
LANGUAGE plpgsql;

CREATE TRIGGER tr_after_insert_borough_stations_freq
AFTER INSERT ON webapp_stations
FOR EACH ROW EXECUTE PROCEDURE update_borough_stations_freq();

INSERT INTO webapp_stations(station_id,station_name, location) VALUES (9999,'Random', st_multi(st_GeomFromText('POINT(-0.14152 51.50522)',4326)));


CREATE OR REPLACE FUNCTION delete_borough_stations_freq()
RETURNS TRIGGER AS
$$
DECLARE
i RECORD;
old_freq integer;
BEGIN
-- finds the borough that contains the updated/deleted station
SELECT a.id as bid, a.name as name INTO i FROM webapp_boroughs as a, webapp_stations as b WHERE st_contains(a.geom,b.location) AND b.station_id = OLD.station_id;


IF i.bid IS NOT NULL THEN
	IF TG_OP = 'DELETE' THEN
		-- assigns the old frequency in the old_freq variable
		old_freq := (SELECT a.freq::integer FROM webapp_boroughs as a WHERE a.id = i.bid );
		RAISE NOTICE 'update borough % (%) frequency % to %', i.name,i.bid, old_freq, old_freq - 1;
		-- updates the frequency		
		UPDATE webapp_boroughs as a SET freq = old_freq -1 WHERE a.id = i.bid;
	END IF;	
END IF;
RETURN OLD;
END; $$
LANGUAGE plpgsql;


CREATE TRIGGER tr_before_delete_borough_stations_freq
BEFORE DELETE ON webapp_stations
FOR EACH ROW EXECUTE PROCEDURE delete_borough_stations_freq();


DELETE FROM webapp_stations WHERE station_id=9999;
