from selenium import webdriver # performs direct calls to the browser using each browser's native support for automation
from selenium.common import exceptions
from bs4 import BeautifulSoup
from time import sleep
from pyvirtualdisplay import Display
import pdb
from json import loads
import pandas as pd
import requests, os
import psycopg2
from tqdm import tqdm
from random import randint,random


class TflCrawler():
    def __init__(self):
        '''
            Constructor method that instantiate the TflCrawler.
        '''
        self.__site = 'http://cycling.data.tfl.gov.uk/'
        self.__elements = {} # initialise an empty dictionary
        self._file_type = 'CSV file'
        self.__folder_dir = os.path.abspath(os.path.dirname(__file__))

    def _start_crawling(self, driver_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'chromedriver'))):
        '''
            Start crawling process, creating and invisible browser display, with 800 by 600 dimension. Additionally,
            the location of Chrome driver is specified.

        :param driver_dir: defines the location of Chrome driver. The directory of the driver is specified as a relative
                path of the user working directory.
        '''
        try:
            print('start driver...')
            self._display = Display( visible= 0, size = (800,600)) # create a chrome display with 800*600 dimension
            self._display.start() # starts the browser
            self._driver = webdriver.Chrome(driver_dir) # set the location of web driver
        except Exception as e:
            print(f'[No driver was identified. Identified files: {os.listdir(driver_dir)}]')

    def _stop_crawling(self):
        '''
            It closes the browser display that was initialised by the start_crawling method. The driver it also stops.
        '''
        print('closing driver...')
        self._display.stop()
        self._driver.quit()

    def _get_site(self, url):
        '''
            The current method performs a request on http://cycling.data.tfl.gov.uk/ server and gets a response. The content
            of the response is converted in HTML and is returned by the method.
        :param url: the url of http://cycling.data.tfl.gov.uk/'
        '''

        try:
            self._driver.get(url) # navigates to page
            sleep(5)  # stops the code execution so that the HTML content to be loaded (5 to 10 seconds)
            return self._driver.execute_script('return document.body.innerHTML') # load the HTML content
        except Exception as e:
            print(f'[Unable to reach {self.__site}. Error : {str(e)}]')

    def _populate_dictionary(self, html):
        '''
            The HTML structure that has been retrieved by __get_site method is analysed such that a dictionary of all
            csv files within the website is constructed. The dictionary is populated by each csv file that may be uploaded
            on TFL website. Each csv file is encapsulated as a dictionary, containing keys such that [name, url, date, size].
        :param html: the html structure that is created by the __get_site method
        '''
        try:
            print('get the content...')
            soup = BeautifulSoup(html, 'html.parser') # creates a soup object and defines how the HTML will be parsed
            # finds all tr elements with an attribute of data-level=3
            main_content = soup.find_all('tr', attrs= { 'data-level' : '3' })

            # iterate over the tr elements
            for i,item in enumerate(main_content):
                td = item.find_all('td') # retrieves the td elements within the tr

                # checks if the type of the 4th td element is CSV
                if (td[3].string == self._file_type):
                    # Populates the dictionary
                    self.__elements[i] ={
                            'name' : td[0].a.string,
                            'url' : td[0].a['href'],
                            'date' : td[1].string,
                            'size' : td[2].string
                    }
        except Exception as e:
            print(f'[Unable to parse the content of {self.__site}. Error: {str(e)}]')

    def parse(self):
        '''
            Performs the entire process to parse the TFL website. In particular, starts the Chrome driver, waits until the site
            to load the HTML content, and therefore performs a request to the website. Then, the response is parsed, populating
            a dictionary that maintains all the csv files that might exist on that site
        :param driver_dir: defines the Google driver relative directory
        '''

        self._start_crawling(os.path.join(self.__folder_dir,'chromedriver'))
        html = self._get_site(self.__site)
        self._populate_dictionary(html)
        self._stop_crawling()

    def retrieve_csv_files(self, DNS,rel_path):
        '''
            Iterates over the constructed dictionary and retrieves each csv file that is identified. The csv files are saved
            locally. Additionally, the corresponded relations of the DB are created
        :param path:  the relative path, which determines the location that the created csv file would be stored.
        '''

        def populate_stations_pairs_relation(df):
            def insert(l):
                if len(l) > 1:
                    # adds a colon at the end of the statement
                    l[-1] = no_space_join([l[-1][:-1], ';'])
                    # joins the insert statements
                    statement = no_space_join(l)

                    # insert the query
                    execute(statement)
                    conn.commit()

            # Drops duplicate routes, that have a start-end station which already exists
            dfrout= df[['StartStation Id','EndStation Id']].drop_duplicates()
            # drop OD routes that started and ended at the same station

            dfrout = dfrout.drop(dfrout[(dfrout['StartStation Id'] == dfrout['EndStation Id'])].index)

            # Variables to avoid overheading
            execute = cur.execute
            fetchall = cur.fetchall

           # corresponds to the stations that already exists in the DB AND have a location
            execute('SELECT station_id,st_asText(location) FROM webapp_stations WHERE location IS NOT NULL')
            # gets the stations that have a location
            stations = dict([(station[0], station[1].replace('MULTIPOINT', '')) for station in fetchall()])

            # stations that in do not have a location in the database, are removed from the data frame
            sids = [s for s in stations.keys()]
            dfrout = dfrout[dfrout['StartStation Id'].isin(sids) == dfrout['EndStation Id'].isin(sids)]

            # requests the pairs of stations that exist in the database
            execute('SELECT start_station_id,end_station_id FROM webapp_stations_pairs_routes')
            pairs_dict = dict([(pair,pair) for pair in fetchall()])

            # Variables that will used to construct the request url
            #plan = '&plan='
            #plan_options = ['fastest','balanced','quietest']
            plan = '&plan=balanced'
            default_url = 'https://www.cyclestreets.net/api/journey.json?key=112d0fc4c69f3951&itinerarypoints='
            nPairs = dfrout.shape[0]
            try:
                # Variables out of the for loop
                #l = ['INSERT INTO webapp_stations_pairs_routes(start_station_id,end_station_id,fastest_ref_dist,fastest_ref_time,fastest_ref_geom,balanced_ref_dist,balanced_ref_time,balanced_ref_geom,quietest_ref_dist,quietest_ref_time,quietest_ref_geom) VALUES ']
                l = ['INSERT INTO webapp_stations_pairs_routes(start_station_id,end_station_id,balanced_ref_dist,balanced_ref_time,balanced_ref_geom) VALUES ']
                comma_join = ','.join
                no_space_join = ''.join
                pipe_join = '|'.join

                for i_pair,pair in enumerate(dfrout.itertuples()):
                    # every 100 requests, stop the execution for 10 seconds (request policy)
                    if i_pair % 1000 == 0 and i_pair > 0:
                        sleep(5)
                        print(f'Pair : {i_pair+1} of {nPairs}')

                    start_station_id = int(pair[1])
                    end_station_id = int(pair[2])

                    # checks for OD pairs that do not exist in the DP (if the )
                    if (start_station_id,end_station_id) not in pairs_dict:
                        try:
                            start_coords = stations[start_station_id][1:-1].replace(' ',',')
                            end_coords = stations[end_station_id][1:-1].replace(' ',',')

                            #time,distance,coords = [],[],[]
                            #atime = time.append
                            #adistance = distance.append
                            #acoords = coords.append
                            #for option in plan_options:
                            # request the link from www.cyclestreet.com
                            response = requests.get(no_space_join([default_url, pipe_join([start_coords,end_coords]), plan])).json()['marker'][0]['@attributes']
                            # loads the json file into a python object(dictionary)
                            time = response['time']
                            distance = response['length']
                            coords = f"st_GeomFromText('LINESTRING({response['coordinates'].replace(' ','?').replace(',',' ').replace('?',',')})',4326)"
                            #response_json = loads(response)['marker'][0]['@attributes']
                            #atime(response['time'])
                            #adistance(response['length'])
                            #acoords(f"st_GeomFromText('LINESTRING({response['coordinates'].replace(' ','?').replace(',',' ').replace('?',',')})',4326)")

                        except (KeyError,AttributeError):
                            continue

                        # creates a statement of the current pair
                        #statement = no_space_join(['(',comma_join([str(start_station_id),str(end_station_id),distance[0],time[0],coords[0],distance[1],time[1],coords[1],distance[2],time[2],coords[2]]),'),'])
                        statement = no_space_join(['(',comma_join([str(start_station_id),str(end_station_id),distance,time,coords]),'),'])
                        l.append(statement)

                    if i_pair % 100 == 0:
                        insert(l)
                        l = ['INSERT INTO webapp_stations_pairs_routes(start_station_id,end_station_id,balanced_ref_dist,balanced_ref_time,balanced_ref_geom) VALUES ']
                        #l = ['INSERT INTO webapp_stations_pairs_routes(start_station_id,end_station_id,fastest_ref_dist,fastest_ref_time,fastest_ref_geom,balanced_ref_dist,balanced_ref_time,balanced_ref_geom,quietest_ref_dist,quietest_ref_time,quietest_ref_geom) VALUES ']

            except Exception as e:
                print('Error while data of webapp_stations_ref_routes were requested...')
            try:
                insert(l)
                return stations
            except:
                print('Error while the INSERT statement was executed for the webapp_stations_ref_routes relation')

        def insert_values_db(values, table_attributes,relation,null_stations):

            # Local Variables
            statement = [f"INSERT INTO {table_attributes} VALUES "]
            append = statement.append # its assign so that we avoid the overheating inside the loop
            replace = str.replace # its assign so that we avoid overheating inside the loop
            n = values.shape[0]-1 # number of observations

            # If the relation that is examined is the stations, receive the spatial location of each station
            if relation == 'webapp_stations':
                # stations_location =[(randint(0,89) + random() ,randint(0,89) + random()) for e in range(values.shape[0])]
                try:
                    stations_location, null_stations = get_station_location(driver_dir= os.path.join(self.__folder_dir,'chromedriver'), url ='https://api.tfl.gov.uk/swagger/ui/index.html?url=/swagger/docs/v1#!/BikePoint/BikePoint_Search' , stations =  values['StartStation Name'].values.tolist(), null_stations = null_stations)
                except Exception as e:
                    print('Error - line 228')
            elif relation == 'webapp_routes':
                stations = populate_stations_pairs_relation(values) # returns a dictionary, with all the stations that have a location
                cur.execute('SELECT id,start_station_id,end_station_id FROM webapp_stations_pairs_routes')
                pairs = dict([((pair[1],pair[2]),pair[0]) for pair in cur.fetchall()])

            # Iterate over each observation and create the corresponded INSERT statement
            for irow, row in enumerate(values.itertuples()):
                pk = row[1] # assign the value of pk to a local variable
                try:
                    if relation == 'webapp_bikes':
                            append(replace(f"({pk}),", "\\'", "''"))
                    elif relation == 'webapp_stations':
                        try:
                            append(replace(f"({pk},'{row[2]}', ST_GeomFromText('MULTIPOINT({stations_location[irow][0]} {stations_location[irow][1]})',4326)),", "\\'", "''"))
                        except:
                            continue
                    elif relation == 'webapp_routes':
                        # get only the routes that i) do not have the same starting and ending station and i) have a start or end station that contains a location in the db
                         if (row[6] != row[7]) and (row[6] in stations) and (row[7] in stations) :
                            pair_id = pairs[(row[6],row[7])]
                            append(replace(f"({pk},'{row[2]}','{row[3]}',{abs(row[4])},{row[5]},{pair_id}),", "\\'", "''"))

                except (ValueError,KeyError):
                    continue

            # Constructs the INSERT statement
            if len(statement) > 1:
                statement[-1] = ''.join([statement[-1][:-1] + ';'])
                statement = ''.join(statement)
                # INSERT the new values into the database
                sql_execute(statement)
                conn.commit() # commit the transaction
            if relation =='webapp_stations':
                return null_stations

        def populate_relation(df, df_main_all_names, relation, pk , table_attributes, null_stations):
            # Local variables
            def process_df(df, df_main_all_names,relation):
                # in order to avoid error in subsequent procedures, we need to receive the Id of the starting and ending stations
                if relation == 'webapp_stations':
                    start_stations_df = df[df_main_all_names[1]].dropna()
                    scol = start_stations_df.columns
                    end_stations_df = df[['EndStation Id','EndStation Name']].dropna()
                    end_stations_df.columns = [scol[0],scol[1]]
                    ndf = pd.concat([start_stations_df,end_stations_df], axis= 0).drop_duplicates([df_main_all_names[0]])
                else:
                    # drops the duplicates from the primary key for the webapp_routes and webapp_bikes relation
                    ndf = dataframe(df[df_main_all_names[1]]).drop_duplicates([df_main_all_names[0]]).dropna()
                return ndf

            new_values = []
            append = new_values.append
            dataframe = pd.DataFrame

            # Retrieves the csv sub-dataframe that defines a relation
            try:
                ndf = process_df(df,df_main_all_names,relation)
            except (TypeError,IndexError,KeyError):
                df.columns = ['Rental Id','Duration','Bike Id','End Date','EndStation Id','EndStation Name','Start Date','StartStation Id', 'StartStation Name']
                ndf = process_df(df,df_main_all_names,relation)


            # Dimensions of the table
            n = ndf.shape[1]
            # Performs a SELECT query that will return current values within the db
            sql_execute(f"SELECT {pk[1]} FROM {relation};")
            # identify the pk of each entity - a dictionary is used for more efficient search
            stored_pks= dict([(e[pk[0]],e[pk[0]]) for e in cur.fetchall()])

            try:
                # Look for new values
                for row in ndf.itertuples():
                    if (row[1] not in stored_pks):
                        append(row[1])

                if len(stored_pks) != 0:
                    if n == 1: # 1 Dimensional relations
                        if len(new_values) > 0:
                            insert_values_db(dataframe({f'{df_main_all_names[0]}' : new_values}), table_attributes, relation,null_stations)

                    else: # n Dimensional relations
                         if len(new_values) > 0:
                            new_values_joined = dataframe({ df_main_all_names[0]: new_values}).merge(ndf,how='left',left_on= df_main_all_names[0], right_on = df_main_all_names[0])
                            if relation == 'webapp_stations':
                                null_stations = insert_values_db(new_values_joined[df_main_all_names[1]], table_attributes, relation,null_stations)
                                return null_stations
                            else:
                                insert_values_db(new_values_joined[df_main_all_names[1]], table_attributes, relation,null_stations)
                else:
                    if relation == 'webapp_stations':
                        null_stations = insert_values_db(dataframe(ndf[df_main_all_names[1]]), table_attributes, relation,null_stations)
                        return null_stations
                    else:
                        insert_values_db(dataframe(ndf[df_main_all_names[1]]), table_attributes, relation, null_stations)

            except psycopg2.InternalError:
                conn.rollback()
                process_df(df, df_main_all_names, relation)
            except Exception as e:
                print(f'Line 327 - {e}')
        #-------------------------------------------------------------------------------------------------------------------------

        try:
            # Local Variables
            join = os.path.join
            exists = os.path.exists
            size = os.path.getsize
            cd = self.__folder_dir # gives the directory of tflcrawler
            read_csv = pd.read_csv

            # establish a connection with o PostgreSQL database, based on the given DNS parameter
            conn = psycopg2.connect(DNS)
            cur = conn.cursor() # initialise a cursor
            sql_execute = cur.execute # cur.execute command is assigned as local variable (avoid dot overheating)
            null_stations = ['Bourne Street, Belgravia'] # list that will check if a station is null

            path = join(cd,rel_path) # Defines the path where the csv files will be stored
            print('starts to retrieve the csv files...')
            elements = self.__elements # assign the current dictionary to a local variable

            # iterate over the dictionary elements
            for value in tqdm(elements.values()):
                name = value['name'] # file name
                try:
                    csv_path = join(path, name) # assign a full path fof the file
                    print(csv_path)

                    # if the file does not exist or the file exists, having a size of zero (nothing within it)
                    if (not exists(csv_path)) or (exists(csv_path) and size(csv_path) == 0):

                        # request the csv file from the server
                        try:
                            response = requests.get(value['url'])
                        except (requests.ConnectionError, requests.ConnectTimeout, requests.HTTPError, requests.TooManyRedirects) as error:
                            print(str(error))
                        # convert the text to a generator
                        splitted_text = response.iter_lines(chunk_size= 512)

                        # opens and write the file
                        with open(csv_path, 'w') as file:
                            for line in splitted_text:
                                file.write(str(line)[2:-1] + '\n')
                            file.close()

                        # reads the created csv file
                        df = read_csv(filepath_or_buffer= csv_path, delimiter=',' ,encoding= 'utf-8')
                        # Populates the Bikes entity
                        populate_relation(df = df, df_main_all_names= ('Bike Id', 'Bike Id'), relation= 'webapp_bikes' , pk = (0,'bike_id'), table_attributes= 'webapp_bikes(bike_id)', null_stations = null_stations)

                        # Populates the Stations entity
                        condition = True # initialise a boolean variable that checks if the populate_relation function of stations has been correctly executed
                        while(condition):
                            try:
                                # populate the db with the corresponded values of stations
                                null_stations = populate_relation(df = df, df_main_all_names= ('StartStation Id', ['StartStation Id', 'StartStation Name']) , relation ='webapp_stations', pk = (0,'station_id'), table_attributes= 'webapp_stations(station_id,station_name,location)', null_stations = null_stations)

                                # set the condition to false and exit from the while loop
                                condition = False
                            except ValueError:  # If the function returns an error due to unsimilarity of the file, SKIP the file
                                condition = False
                            except Exception as e: # If the function returns any other error, execute the function again
                                # The function may do not executed correctly due to problems with the connection with the API and other requests
                                print('POPULATE_RELATION IS EXECUTED AGAIN...')
                                continue
                        # Populates the Routes entity
                        populate_relation(df = df, df_main_all_names=('Rental Id', ['Rental Id','Start Date','End Date', 'Duration','Bike Id','StartStation Id', 'EndStation Id']), relation= 'webapp_routes', pk =(0,'rental_id'), table_attributes='webapp_routes(rental_id,start_date,end_date,duration,bike_id,station_pairs_id)', null_stations = null_stations)

                except Exception as e:
                    print(f'[Error of file {name} - Inside the FOR loop]')
                    continue

        except Exception as e:
            # Close the cursor and database connection as well
            cur.close()
            conn.close()
            print(f'[ Error while the files are retrieved. Error: {str(e)}]')

    @property
    def elements(self):
        return self.__elements

    @property
    def site(self):
        return self.__site

def get_station_location(driver_dir,url, stations, null_stations):
    '''
        This function returns the locations of the bicycles stations. An invisible browser window is constructed which requests the location
        of an individual station. The results are return as a list, which at each location a tuple has been allocated containing the longitude
        and latitude values (lon,lat).

    :param driver_dir: determines the location of the Chrome driver
    :param url: specifies the url of tfl API (https://api.tfl.gov.uk/swagger/ui/index.html?url=/swagger/docs/v1#!/BikePoint/BikePoint_Search)
    :param stations: specifies the stations names, given as a list
    :return: the locations of the stations as a list, having the same order as the given stations parameter
    '''

    def request_station(station, url_xpath):
        '''

        :param station: station name
        :param url_xpath: xpath of the element that contains the corresponded https request of the station
        :return: the location of the station as a tuple (lon,lat) or None if the station was not identified
        '''

        try:
            search_field.send_keys(station) # update the search field
            click_field.click() # request the station from the api
            sleep(5) # stop the execution of the code, so that the API can response
        except exceptions.WebDriverException as e:
            # a WebDriverException is thrown because the value that is return from the response is empty
            raise exceptions.WebDriverException

        # Gets the corresponded URL of the station
        try:
            try:
                # find the https url of the station
                request_url = crawler.find_element_by_xpath(url_xpath).text

                # if the retrieved text is still empty (because the API has not responsed), wait until the request_url variable is filled
                if request_url == "":
                    # CAUTION: the code is trapped in an infinity loop until it receives a response
                    condition = True
                    while(condition):
                        print('inside while')
                        sleep(5)
                        request_url = crawler.find_element_by_xpath(url_xpath).text
                        if request_url != "":
                            print('condition set to false')
                            condition = False
            except Exception as e:
                print('CRAWLER PROBABLY CANNOT FIND THE REQUESTED URL - LINE 445')

            try:
                # requests the station's information
                response = requests.get(request_url)
            except UnboundLocalError as e:
                print('REQUEST FAILURE - LINE 451')
                return None

            # If the request has been succesfuly performed
            if response.status_code == requests.codes.ok:
                location = response.json() # returns a json object
                if len(location) == 0:
                    return None # return None if the API could not find any information related to the station
                else:
                    return (location[0]['lon'], location[0]['lat']) # return a tuple with the location of the API
            else:
                return None
        except Exception as e :
            print(f'{str(e)} - line: 350')
            return None
    def close_driver_display(crawler,display):
        display.stop()
        crawler.quit()

    def instantiate_browser(url, driver_dir):
        print('start collecting the stations location...')
        # Create a virtual display that will contain the browser
        display = Display(visible=0, size= (1600,800))
        display.start()
        # Initialise a driver, specifying the driver directory
        crawler = webdriver.Chrome(driver_dir)

        # Gets the specified directory
        crawler.get(url)
        # Since the website's content loads some content using JavaScript, stop the code execution of the code for three seconds
        sleep(3)

        # Finds those elements that will be utilised for the requests
        search_field = crawler.find_element_by_xpath("//div[@id='parm-BikePoint_BikePoint_Search']/div/div/input") # search input
        click_field = crawler.find_element_by_xpath("//div[@id='test-BikePoint_BikePoint_Search']/div/input") # click button
        close_btn = crawler.find_element_by_xpath('//*[@id="modal-BikePoint_BikePoint_Search"]/div/div/div[1]/button') # close button
        url_xpath = '//*[@id="modal-BikePoint_BikePoint_Search"]/div/div/div[2]/div/div[1]/pre'

        return (crawler,display,search_field,click_field,close_btn,url_xpath)

    crawler,display,search_field,click_field,close_btn,url_xpath = instantiate_browser(url,driver_dir)
        # instantiate a list that will contain the stations location
    location = []

    # Iterate over the stations and requests the station's location
    for station in stations:
        try:
            # removes some punctuation so that the search result won't be affected
            if ("\\" in station) or ("'" in station):
                if ("\\" in station):
                    station = station.replace('\\','')
                elif ("\'" in station):
                    station = station.replace("\'",'')
                else:
                    station = station.replace("'",'')
            # Get the location
            try:
                print(f'Station : {station}')
                if station not in null_stations:
                    condition = True
                    while(condition):
                        try:
                            response = request_station(station, url_xpath)
                            if response is not None:
                                location.append(response)
                            else:
                                location.append(None)
                                null_stations.append(station)
                            condition = False
                        except exceptions.WebDriverException as e:
                            # a none value is added on the list
                            location.append(None)
                            condition = False
                                # Continue because no
                                # closes the display and the browser
                            close_driver_display(crawler,display)
                                # reinitialised the crawler
                            crawler, display,search_field, click_field, close_btn, url_xpath = instantiate_browser(url,driver_dir)

                    # After the location is retrieved, is added on the locations list
                else:
                    location.append(None)
            finally:
                if station not in null_stations:
                    # Clear the content of the previous query and close the pop up window
                    try:
                        close_btn.click()
                        search_field.clear()
                    except exceptions.ElementNotVisibleException:
                        pass # because the browser is closed and the station is not included in the null stations
        except Exception as e:
            print(f'Line 557 - {e}')

    # close the virtual display and the browser as well
    close_driver_display(crawler,display)

    # return the list with the locations
    return (location,null_stations)

if __name__ == '__main__':
    crawler = TflCrawler() # instantiate the crawler
    crawler.parse() # retrieves the content
    crawler.retrieve_csv_files(DNS = 'host=localhost dbname=cyclists_db user=masimou password=ma.SI3007', rel_path = '../../../csv/' )
    api_url = 'https://api.tfl.gov.uk/swagger/ui/index.html?url=/swagger/docs/v1#!/BikePoint/BikePoint_Search'
