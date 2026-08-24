# Land Mapper

Simple Woodland Discovery For Land Owners

## Installation

### Docker

To run locally with Docker follow these steps (for Oregon):

Pre-requisites:
- Docker 
- Docker compose
1. Clone the repo
```
git clone https://github.com/Ecotrust/landmapper.git
```
2. Check out the `dockerize` branch
```
git checkout dockerize
```
3. Clone dependent repos in a location next to the landmapper repo
```
git clone https://github.com/Ecotrust/madrona-features.git
git clone https://github.com/Ecotrust/madrona-manipulators.git
git clone https://github.com/Ecotrust/p97-nursery.git
```
4. Add the following files to the `docker/` directory. Ask an Ecotrust Software team member for these files: 
- OR_TAXLOTS.sql
- OR_POPULATION_2021.sql
- FOREST_TYPES_2021.sql
- OR_SOIL_2021.sql

5. Start the docker containers using docker compose
```
docker compose up -d --build
```

6. Application should be live at `https://localhost:8000/`

---  

[See Wiki For Additional Documentation](https://github.com/Ecotrust/landmapper/wiki)
