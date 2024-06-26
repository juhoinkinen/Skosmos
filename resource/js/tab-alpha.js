/* global Vue */
/* global partialPageLoad, getConceptURL, fetchWithAbort */

const tabAlphaApp = Vue.createApp({
  data () {
    return {
      indexLetters: [],
      indexConcepts: [],
      selectedConcept: '',
      loadingLetters: false,
      loadingConcepts: false
    }
  },
  provide () {
    return {
      partialPageLoad,
      getConceptURL
    }
  },
  mounted () {
    // load alphabetical index if alphabetical tab is active when the page is first opened (otherwise only load the index when the tab is clicked)
    if (document.querySelector('#alphabetical > a').classList.contains('active')) {
      this.loadLetters()
    }
  },
  methods: {
    handleClickAlphabeticalEvent () {
      // only load index the first time the page is opened or if selected concept has changed
      if (this.indexLetters.length === 0 || this.selectedConcept !== window.SKOSMOS.uri) {
        this.selectedConcept = ''
        this.indexLetters = []
        this.indexConcepts = []
        this.loadLetters()
      }
    },
    loadLetters () {
      this.loadingLetters = true
      fetch('rest/v1/' + window.SKOSMOS.vocab + '/index/?lang=' + window.SKOSMOS.lang)
        .then(data => {
          return data.json()
        })
        .then(data => {
          this.indexLetters = data.indexLetters
          this.loadingLetters = false
          this.loadConcepts(this.indexLetters[0])
        })
    },
    loadConcepts (letter) {
      this.loadingConcepts = true
      const url = 'rest/v1/' + window.SKOSMOS.vocab + '/index/' + letter + '?lang=' + window.SKOSMOS.lang + '&limit=50'
      fetchWithAbort(url, 'alpha')
        .then(data => {
          return data.json()
        })
        .then(data => {
          this.indexConcepts = data.indexConcepts
          this.loadingConcepts = false
        })
        .catch(error => {
          if (error.name === 'AbortError') {
            console.log('Fetch aborted for letter ' + letter)
          } else {
            throw error
          }
        })
    }
  },
  template: `
    <div v-click-tab-alphabetical="handleClickAlphabeticalEvent">
      <tab-alpha
        :index-letters="indexLetters"
        :index-concepts="indexConcepts"
        :selected-concept="selectedConcept"
        :loading-letters="loadingLetters"
        :loading-concepts="loadingConcepts"
        @load-concepts="loadConcepts($event)"
        @select-concept="selectedConcept = $event"
      ></tab-alpha>
    </div>
  `
})

/* Custom directive used to add an event listener on clicks on an element outside of this component */
tabAlphaApp.directive('click-tab-alphabetical', {
  beforeMount: (el, binding) => {
    el.clickTabEvent = event => {
      binding.value() // calling the method given as the attribute value (loadLetters)
    }
    document.querySelector('#alphabetical').addEventListener('click', el.clickTabEvent) // registering an event listener on clicks on the alphabetical nav-item element
  },
  unmounted: el => {
    document.querySelector('#alphabetical').removeEventListener('click', el.clickTabEvent)
  }
})

tabAlphaApp.component('tab-alpha', {
  props: ['indexLetters', 'indexConcepts', 'selectedConcept', 'loadingLetters', 'loadingConcepts'],
  emits: ['loadConcepts', 'selectConcept'],
  inject: ['partialPageLoad', 'getConceptURL'],
  methods: {
    loadConcepts (event, letter) {
      event.preventDefault()
      this.$emit('loadConcepts', letter)
    },
    loadConcept (event, uri) {
      partialPageLoad(event, getConceptURL(uri))
      this.$emit('selectConcept', uri)
    },
    getListStyle () {
      // get height and width of pagination and sidebar tabs elements if they exist
      const height = this.$refs.pagination && this.$refs.pagination.clientHeight + document.getElementById('sidebar-tabs').clientHeight
      const width = this.$refs.pagination && this.$refs.pagination.clientWidth
      return {
        height: 'calc( 100% - ' + height + 'px)',
        width: width + 'px'
      }
    }
  },
  template: `
    <template v-if="loadingLetters">
      <div>
        Loading...
      </div>
    </template>
    <template v-else>
      <ul class="pagination" v-if="indexLetters.length !== 0" ref="pagination">
        <li v-for="letter in indexLetters" class="page-item">
          <a class="page-link" href="#" @click="loadConcepts($event, letter)">{{ letter }}</a>
        </li>
      </ul>
    </template>
    
    <template v-if="loadingConcepts">
      <div>
        Loading...
      </div>
    </template>
    <template v-else>
      <div class="sidebar-list" :style="getListStyle()">
        <ul class="list-group" v-if="indexConcepts.length !== 0">
          <li v-for="concept in indexConcepts" class="list-group-item py-1 px-2">
            <template v-if="concept.altLabel">
              <span class="fst-italic">{{ concept.altLabel }}</span>
              <i class="fa-solid fa-arrow-right"></i>
            </template>
            <a :class="{ 'selected': selectedConcept === concept.uri }"
              :href="getConceptURL(concept.uri)" @click="loadConcept($event, concept.uri)"
            >{{ concept.prefLabel }}</a>
          </li>
        </ul>
      </div>
    </template>
  `
})

tabAlphaApp.mount('#tab-alphabetical')
