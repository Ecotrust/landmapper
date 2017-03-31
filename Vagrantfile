# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant::Config.run do |config|
    # Base box to build off, and download URL for when it doesn't exist on the user's system already
    config.vm.box = "ubuntu/xenial64"

    #Enforce provisioning of 5GB of RAM - required for running MarinePlanner properly
    #If you don't have 5 GB, you can drop the memory value, or comment everything out completely.
    # config.vm.customize [
    #   "modifyvm", :id,
    #   "--memory", "5120"
    # ]

    # Forward a port from the guest to the host, which allows for outside
    # computers to access the VM, whereas host only networking does not.
    config.vm.forward_port 8000, 8111
    config.vm.forward_port 5432, 65432

    config.ssh.forward_agent = true

    # Share an additional folder to the guest VM. The first argument is
    # an identifier, the second is the path on the guest to mount the
    # folder, and the third is the path on the host to the actual folder.
    config.vm.share_folder "project", "/usr/local/apps/marineplanner-core", "."

    ### INSTALL SYSTEM-WIDE DEPENDENCIES
    ## -- Python, GEOS, Postgresql, PostGIS, GDAL, Proj, etc...
    # Args: Ubuntu Version, GEOS Version, PostgreSQL Version
    # Proj Version: '4.9.1'
    # Proj Datumgrid Version: '1.5'
    # config.vm.provision :shell, :path => "scripts/vagrant_provision0.sh", :args =>"'xenial' '3.5.0' '9.5'"

    ### INSTALL ENVIRONMENT AND SETUP DB
    # Args: Project Name, Application name, Database name
    # config.vm.provision :shell, :path => "scripts/vagrant_provision.sh", :args => "'marineplanner-core' 'marineplanner' 'marineplanner'", :privileged => false

    ### INSERT MODULE PROVISION FILES HERE ###
    config.vm.provision :shell, :path => "apps/marco-map_groups/scripts/vagrant_provision.sh", :args => "'marineplanner-core'", :privileged => false
    config.vm.provision :shell, :path => "apps/mp-accounts/scripts/vagrant_provision.sh", :args => "'marineplanner-core'", :privileged => false
    config.vm.provision :shell, :path => "apps/mp-visualize/scripts/vagrant_provision.sh", :args => "'marineplanner-core'", :privileged => false
    ### END MODULE PROVISION FILES ###

    # If a 'Vagrantfile.local' file exists, import any configuration settings
    # defined there into here. Vagrantfile.local is ignored in version control,
    # so this can be used to add configuration specific to this computer.

    if File.exist? "Vagrantfile.local"
        instance_eval File.read("Vagrantfile.local"), "Vagrantfile.local"
    end
end
