## Description

This project is an implementation of my MSc study at University College London (UCL), which uses information of London bicycle sharing system (LBSS), and aims to develop a web tool that applies various spatio-temporal analytics and visualisation techniques. The main objective of the project is to uncover patterns, relationships and correlations that are observed in the cycling data. 

## Technologies - Resources

**Front-end technologies**
- JavaScript (ES6)
- HTML5
- CSS3
- [jQuery](https://jquery.com/) 
- [Bootstrap](https://getbootstrap.com/)

**Back-end technologies**
- [Django](https://www.djangoproject.com/)
- [Postgres](https://www.postgresql.org/) with [Postgis](https://postgis.net/) extension

### Data Resources
- [TFL](https://tfl.gov.uk/) 
- [CycleStreets](https://www.cyclestreets.net/) 
- [Data.gov.uk](https://data.gov.uk/)

## Graphical User Interface
![main_scale](https://user-images.githubusercontent.com/32243459/45579687-b1517e00-b881-11e8-97e3-b65a297ae180.png)

## Visualisations
<img src='https://user-images.githubusercontent.com/32243459/45579721-f37abf80-b881-11e8-82f5-63143561fdc0.png' width='400' height='250'>

**Figure 1:** Visualisation of frequency variable of boroughs and docking stations of LBSS. Each geometry is classified using Jenks natural breaks technique. A filtering functionality is available. 

<img src='https://user-images.githubusercontent.com/32243459/45579737-24f38b00-b882-11e8-81e0-9b69c92b01d5.png' width='400' height='250'>

**Figure 2:** Visualisation of flow variable related to King’s Cross cycling paths. We apply a filtering in order to show the top N routes and we measure properties based on the user selection. 

<img src='https://user-images.githubusercontent.com/32243459/45579750-4fdddf00-b882-11e8-83e2-c9866e0e5c6b.png' width='400' height='250'>

**Figure 3:** We compare the distribution of flow variable related to King’s Cross cycling paths with a generated baseline variable. We apply descriptive statistics metrics and we visualise each distribution through a boxplot graph.
At the bottom, we construct a spatial network of King’s Cross cycling routes and we measure properties such as station fulfillment, aggregated flow, aggregated ellipsoid distance etc.

<img src='https://user-images.githubusercontent.com/32243459/45579805-a3502d00-b882-11e8-972b-4db6b2f3fea8.png' width='400' height='250'>

**Figure 4:** Similarly as Figure 4, we visualise the distribution of flow variable with a generated baseline distribution through PDF, and we measure their divergence through relative entropy.
At the bottom, we analyse temporally the cycling routes of King’s Cross with a daily and monthly lag. Through time-series graphs, we are able to identify trends, periodic fluctuactions etc.

<img src='https://user-images.githubusercontent.com/32243459/45579785-8287d780-b882-11e8-8125-41173417e908.png' width='400' height='250'>

**Figure 5**: Visualiasation of the K-Means clustering analysis of boroughs and docking stations of Greate London. The attribute of longitude, latitude, and frequency are used to identify group of objects with similar properites. We determine three and five optimal clusters for the layer of boroughs and docking stations, respectively.
