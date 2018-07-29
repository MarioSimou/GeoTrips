CREATE OR REPLACE FUNCTION update_station_pairs_routes_freq()
RETURNS VOID AS 
$$
DECLARE
rec RECORD;
BEGIN

-- temporal table i
EXECUTE format('CREATE TEMP TABLE i AS (SELECT id FROM webapp_stations_pairs_routes)');
--EXECUTE format('CREATE INDEX i_idx ON i USING btree(id)');
RAISE NOTICE'i has been created..';

-- temporal table j
EXECUTE format('CREATE TEMP TABLE j AS (SELECT station_pairs_id as pairsid FROM webapp_routes)');
EXECUTE format('CREATE INDEX j_idx ON j USING btree(pairsid)');
RAISE NOTICE 'j has been created..';


FOR rec IN SELECT id FROM i LOOP
  RAISE NOTICE 'Record: %', rec.id;

  -- updates the value of each pair with the corresponded frequency
  UPDATE webapp_stations_pairs_routes SET freq = (SELECT COUNT(*) FROM j WHERE pairsid=rec.id) WHERE id=rec.id ; 

END LOOP;

-- drops the temporal tables
DROP TABLE i;
DROP TABLE j;

END;
$$
LANGUAGE plpgsql;



